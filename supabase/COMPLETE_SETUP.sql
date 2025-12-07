-- COMPLETE: Anonymous Chat Database Setup
-- Run this ENTIRE script in Supabase SQL Editor to create all tables

-- ============================================================
-- PART 1: CREATE TABLES (if they don't exist)
-- ============================================================

-- Table 1: anonymous_chat_sessions
CREATE TABLE IF NOT EXISTS public.anonymous_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'paired', 'ended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paired_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  ended_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT different_users CHECK (user1_id != user2_id OR user2_id IS NULL)
);

-- Table 2: anonymous_chat_messages (CRITICAL FOR REALTIME)
CREATE TABLE IF NOT EXISTS public.anonymous_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_typing BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (session_id) REFERENCES anonymous_chat_sessions(session_id) ON DELETE CASCADE
);

-- Table 3: anonymous_chat_archive
CREATE TABLE IF NOT EXISTS public.anonymous_chat_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user1_id UUID,
  user2_id UUID,
  messages JSONB NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  message_count INT NOT NULL DEFAULT 0,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PART 2: CREATE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_status 
  ON anonymous_chat_sessions(status, created_at);

CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_users 
  ON anonymous_chat_sessions(user1_id, user2_id);

CREATE INDEX IF NOT EXISTS idx_anonymous_messages_session 
  ON anonymous_chat_messages(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_anonymous_archive_users 
  ON anonymous_chat_archive(user1_id, user2_id);

CREATE INDEX IF NOT EXISTS idx_anonymous_archive_session 
  ON anonymous_chat_archive(session_id);

-- ============================================================
-- PART 3: ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.anonymous_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_chat_archive ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 4: DROP OLD POLICIES (clean slate)
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own anonymous sessions" ON anonymous_chat_sessions;
DROP POLICY IF EXISTS "Users can create waiting sessions" ON anonymous_chat_sessions;
DROP POLICY IF EXISTS "Users can update their sessions" ON anonymous_chat_sessions;
DROP POLICY IF EXISTS "Users can view messages from their sessions" ON anonymous_chat_messages;
DROP POLICY IF EXISTS "Users can send messages in their sessions" ON anonymous_chat_messages;
DROP POLICY IF EXISTS "Users can view their archived chats" ON anonymous_chat_archive;
DROP POLICY IF EXISTS "Users can view messages in their sessions" ON anonymous_chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON anonymous_chat_messages;

-- ============================================================
-- PART 5: CREATE NEW RLS POLICIES
-- ============================================================

-- ===== SESSIONS TABLE POLICIES =====

-- Can view own sessions or any waiting session
CREATE POLICY "view_own_or_waiting_sessions"
  ON anonymous_chat_sessions FOR SELECT
  USING (
    auth.uid() = user1_id OR 
    auth.uid() = user2_id OR
    (status = 'waiting' AND user2_id IS NULL)
  );

-- Can create new waiting session
CREATE POLICY "create_waiting_session"
  ON anonymous_chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user1_id AND status = 'waiting');

-- Can update own sessions
CREATE POLICY "update_own_sessions"
  ON anonymous_chat_sessions FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id)
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ===== MESSAGES TABLE POLICIES =====

-- Users can SELECT (view) messages from their sessions
CREATE POLICY "view_messages_in_session"
  ON anonymous_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM anonymous_chat_sessions
      WHERE session_id = anonymous_chat_messages.session_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

-- Users can INSERT (send) messages in paired sessions
CREATE POLICY "send_messages_in_paired_session"
  ON anonymous_chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM anonymous_chat_sessions
      WHERE session_id = anonymous_chat_messages.session_id
      AND status = 'paired'
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

-- Users can DELETE their own messages
CREATE POLICY "delete_own_messages"
  ON anonymous_chat_messages FOR DELETE
  USING (sender_id = auth.uid());

-- ===== ARCHIVE TABLE POLICIES =====

-- Users can view their own archives
CREATE POLICY "view_own_archives"
  ON anonymous_chat_archive FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ============================================================
-- PART 6: VERIFY EVERYTHING WAS CREATED
-- ============================================================

-- Check tables exist
SELECT 
  tablename,
  schemaname
FROM pg_tables 
WHERE tablename LIKE 'anonymous%'
ORDER BY tablename;

-- Check RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename LIKE 'anonymous%';

-- Check policies exist
SELECT 
  tablename,
  policyname,
  permissive,
  qual
FROM pg_policies
WHERE tablename LIKE 'anonymous%'
ORDER BY tablename, policyname;

-- ============================================================
-- PART 7: CREATE OR REPLACE FUNCTION
-- ============================================================

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
  v_current_user_id UUID;
  v_existing_session_id TEXT;
  v_existing_partner_id UUID;
  v_waiting_session_id TEXT;
  v_waiting_user_id UUID;
  v_new_session_id TEXT;
BEGIN
  v_current_user_id := auth.uid();
  
  -- Check if user already has an active session
  SELECT s.session_id, 
         CASE WHEN s.user1_id = v_current_user_id THEN s.user2_id ELSE s.user1_id END
  INTO v_existing_session_id, v_existing_partner_id
  FROM anonymous_chat_sessions s
  WHERE (s.user1_id = v_current_user_id OR s.user2_id = v_current_user_id)
    AND s.status IN ('waiting', 'paired');
  
  IF v_existing_session_id IS NOT NULL THEN
    RETURN QUERY SELECT v_existing_session_id, v_existing_partner_id, false;
    RETURN;
  END IF;
  
  -- Try to find a waiting user (excluding current user)
  SELECT s.session_id, s.user1_id
  INTO v_waiting_session_id, v_waiting_user_id
  FROM anonymous_chat_sessions s
  WHERE s.status = 'waiting'
    AND s.user1_id != v_current_user_id
    AND s.user2_id IS NULL
  ORDER BY s.created_at ASC
  LIMIT 1;
  
  IF v_waiting_session_id IS NOT NULL THEN
    -- Pair with waiting user
    UPDATE anonymous_chat_sessions
    SET user2_id = v_current_user_id,
        status = 'paired',
        paired_at = NOW()
    WHERE session_id = v_waiting_session_id;
    
    RETURN QUERY SELECT v_waiting_session_id, v_waiting_user_id, false;
  ELSE
    -- Create new session for current user
    v_new_session_id := 'anon_' || gen_random_uuid()::TEXT;
    
    INSERT INTO anonymous_chat_sessions (
      session_id, user1_id, status, created_at
    ) VALUES (
      v_new_session_id, v_current_user_id, 'waiting', NOW()
    );
    
    RETURN QUERY SELECT v_new_session_id, NULL::UUID, true;
  END IF;
END;
$$;

-- ============================================================
-- SUCCESS: All tables and functions created!
-- Next step: Enable Realtime in Supabase UI
-- ============================================================

-- After running this script:
-- 1. Go to Supabase Dashboard
-- 2. Database > Replication
-- 3. Find: anonymous_chat_messages
-- 4. Check: INSERT, UPDATE
-- 5. Click: Save
-- 6. Reload your app

