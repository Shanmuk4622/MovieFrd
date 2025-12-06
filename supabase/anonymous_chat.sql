-- Anonymous 1-on-1 Chat Feature (Omegle-like)
-- This creates tables and functions for temporary anonymous chat sessions

-- Table: anonymous_chat_sessions
-- Stores active and ended anonymous chat sessions
CREATE TABLE IF NOT EXISTS anonymous_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'paired', 'ended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paired_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  ended_by UUID REFERENCES auth.users(id),
  CONSTRAINT different_users CHECK (user1_id != user2_id)
);

-- Index for finding waiting users
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_status ON anonymous_chat_sessions(status, created_at);
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_users ON anonymous_chat_sessions(user1_id, user2_id);

-- Table: anonymous_chat_messages
-- Stores temporary messages for active anonymous sessions
CREATE TABLE IF NOT EXISTS anonymous_chat_messages (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_typing BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (session_id) REFERENCES anonymous_chat_sessions(session_id) ON DELETE CASCADE
);

-- Index for fast message retrieval
CREATE INDEX IF NOT EXISTS idx_anonymous_messages_session ON anonymous_chat_messages(session_id, created_at);

-- Table: anonymous_chat_archive
-- Archives ended chat sessions and their messages
CREATE TABLE IF NOT EXISTS anonymous_chat_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user1_id UUID,
  user2_id UUID,
  messages JSONB NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  message_count INT NOT NULL,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for archive queries
CREATE INDEX IF NOT EXISTS idx_anonymous_archive_users ON anonymous_chat_archive(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_archive_session ON anonymous_chat_archive(session_id);

-- Enable Row Level Security
ALTER TABLE anonymous_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_chat_archive ENABLE ROW LEVEL SECURITY;

-- RLS Policies for anonymous_chat_sessions
-- Users can see their own sessions
CREATE POLICY "Users can view their own anonymous sessions"
  ON anonymous_chat_sessions FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can insert their own waiting sessions
CREATE POLICY "Users can create waiting sessions"
  ON anonymous_chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user1_id AND status = 'waiting');

-- Users can update their own sessions
DROP POLICY IF EXISTS "Users can update their sessions" ON anonymous_chat_sessions;

CREATE POLICY "Users can update their sessions"
  ON anonymous_chat_sessions FOR UPDATE
  TO authenticated
  USING (
    -- Allow if user is already in the session
    auth.uid() = user1_id OR auth.uid() = user2_id
  )
  WITH CHECK (
    -- Allow pairing if adding as user2
    (user2_id = auth.uid() AND status = 'paired') OR
    -- Allow ending session if already part of it
    (status = 'ended' AND (user1_id = auth.uid() OR user2_id = auth.uid()))
  );

-- RLS Policies for anonymous_chat_messages
-- Users can view messages from their sessions
CREATE POLICY "Users can view messages from their sessions"
  ON anonymous_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM anonymous_chat_sessions 
      WHERE session_id = anonymous_chat_messages.session_id 
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

-- Users can send messages in their sessions
CREATE POLICY "Users can send messages in their sessions"
  ON anonymous_chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM anonymous_chat_sessions 
      WHERE session_id = anonymous_chat_messages.session_id 
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
      AND status = 'paired'
    )
  );

-- RLS Policies for anonymous_chat_archive
-- Users can view their archived chats
CREATE POLICY "Users can view their archived chats"
  ON anonymous_chat_archive FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Function: Find or create anonymous chat session
CREATE OR REPLACE FUNCTION find_anonymous_chat_partner()
RETURNS TABLE (
  result_session_id TEXT,
  result_partner_id UUID,
  result_is_new_session BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_session_id TEXT;
  v_existing_partner_id UUID;
  v_waiting_session_id TEXT;
  v_waiting_user_id UUID;
  v_waiting_record_id UUID;
  v_new_session_id TEXT;
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  -- Check if user already has an active session
  SELECT s.session_id, 
         CASE WHEN s.user1_id = v_current_user_id THEN s.user2_id ELSE s.user1_id END
  INTO v_existing_session_id, v_existing_partner_id
  FROM anonymous_chat_sessions s
  WHERE (s.user1_id = v_current_user_id OR s.user2_id = v_current_user_id)
    AND s.status IN ('waiting', 'paired')
  LIMIT 1;
  
  IF v_existing_session_id IS NOT NULL THEN
    RETURN QUERY SELECT v_existing_session_id, v_existing_partner_id, FALSE;
    RETURN;
  END IF;
  
  -- Try to find a waiting user (not ourselves)
  SELECT s.id, s.session_id, s.user1_id
  INTO v_waiting_record_id, v_waiting_session_id, v_waiting_user_id
  FROM anonymous_chat_sessions s
  WHERE s.status = 'waiting' 
    AND s.user1_id != v_current_user_id
    AND s.user2_id IS NULL
  ORDER BY s.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF v_waiting_session_id IS NOT NULL THEN
    -- Pair with waiting user
    UPDATE anonymous_chat_sessions
    SET user2_id = v_current_user_id,
        status = 'paired',
        paired_at = NOW()
    WHERE id = v_waiting_record_id;
    
    RETURN QUERY SELECT v_waiting_session_id, v_waiting_user_id, TRUE;
  ELSE
    -- Create new waiting session
    v_new_session_id := 'anon_' || gen_random_uuid()::TEXT;
    
    INSERT INTO anonymous_chat_sessions (session_id, user1_id, status)
    VALUES (v_new_session_id, v_current_user_id, 'waiting');
    
    RETURN QUERY SELECT v_new_session_id, NULL::UUID, FALSE;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION find_anonymous_chat_partner() TO authenticated;

-- Function: End anonymous chat session and archive it
CREATE OR REPLACE FUNCTION end_anonymous_chat_session(p_session_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record RECORD;
  messages_json JSONB;
BEGIN
  -- Get session details
  SELECT * INTO session_record
  FROM anonymous_chat_sessions
  WHERE session_id = p_session_id
    AND (user1_id = auth.uid() OR user2_id = auth.uid())
    AND status IN ('waiting', 'paired');
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Only archive if session was paired (had messages)
  IF session_record.status = 'paired' THEN
    -- Collect messages as JSON
    SELECT jsonb_agg(
      jsonb_build_object(
        'sender_id', sender_id,
        'content', content,
        'created_at', created_at
      ) ORDER BY created_at
    ) INTO messages_json
    FROM anonymous_chat_messages
    WHERE session_id = p_session_id;
    
    -- Archive the session
    INSERT INTO anonymous_chat_archive (
      session_id, 
      user1_id, 
      user2_id, 
      messages, 
      started_at, 
      ended_at,
      message_count
    )
    VALUES (
      p_session_id,
      session_record.user1_id,
      session_record.user2_id,
      COALESCE(messages_json, '[]'::jsonb),
      session_record.created_at,
      NOW(),
      jsonb_array_length(COALESCE(messages_json, '[]'::jsonb))
    );
  END IF;
  
  -- Mark session as ended
  UPDATE anonymous_chat_sessions
  SET status = 'ended',
      ended_at = NOW(),
      ended_by = auth.uid()
  WHERE session_id = p_session_id;
  
  -- Delete messages (they're archived if needed)
  DELETE FROM anonymous_chat_messages WHERE session_id = p_session_id;
  
  RETURN TRUE;
END;
$$;

-- Function: Clean up old ended sessions (called periodically)
CREATE OR REPLACE FUNCTION cleanup_old_anonymous_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete ended sessions older than 1 hour
  DELETE FROM anonymous_chat_sessions
  WHERE status = 'ended' 
    AND ended_at < NOW() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Function: Get anonymous chat archive for a user
CREATE OR REPLACE FUNCTION get_user_anonymous_archive(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  session_id TEXT,
  partner_id UUID,
  message_count INT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_minutes INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(p_user_id, auth.uid());
  
  RETURN QUERY
  SELECT 
    a.id,
    a.session_id,
    CASE 
      WHEN a.user1_id = target_user_id THEN a.user2_id 
      ELSE a.user1_id 
    END as partner_id,
    a.message_count,
    a.started_at,
    a.ended_at,
    EXTRACT(EPOCH FROM (a.ended_at - a.started_at))::INT / 60 as duration_minutes
  FROM anonymous_chat_archive a
  WHERE a.user1_id = target_user_id OR a.user2_id = target_user_id
  ORDER BY a.ended_at DESC
  LIMIT 50;
END;
$$;
