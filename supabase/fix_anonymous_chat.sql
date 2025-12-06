-- Fix for Anonymous Chat - Run this in Supabase SQL Editor
-- This fixes the ambiguous column reference and RLS policy issues

-- Step 1: Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own anonymous sessions" ON anonymous_chat_sessions;
DROP POLICY IF EXISTS "Users can create waiting sessions" ON anonymous_chat_sessions;
DROP POLICY IF EXISTS "Users can update their sessions" ON anonymous_chat_sessions;
DROP POLICY IF EXISTS "Users can view messages from their sessions" ON anonymous_chat_messages;
DROP POLICY IF EXISTS "Users can send messages in their sessions" ON anonymous_chat_messages;
DROP POLICY IF EXISTS "Users can view their archived chats" ON anonymous_chat_archive;

-- Step 2: Drop and recreate the function with fixed variable names
DROP FUNCTION IF EXISTS find_anonymous_chat_partner();

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

-- Step 2: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION find_anonymous_chat_partner() TO authenticated;

-- Step 3: Recreate RLS policies with proper permissions

-- Policies for anonymous_chat_sessions
CREATE POLICY "Users can view their own anonymous sessions"
  ON anonymous_chat_sessions FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create waiting sessions"
  ON anonymous_chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user1_id AND status = 'waiting');

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

-- Policies for anonymous_chat_messages
CREATE POLICY "Users can view messages from their sessions"
  ON anonymous_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM anonymous_chat_sessions 
      WHERE session_id = anonymous_chat_messages.session_id 
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

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

-- Policies for anonymous_chat_archive
CREATE POLICY "Users can view their archived chats"
  ON anonymous_chat_archive FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Step 4: Test the function
SELECT * FROM find_anonymous_chat_partner();

-- Step 5: Check if tables exist and have correct structure
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_name LIKE 'anonymous_chat%'
ORDER BY table_name;
