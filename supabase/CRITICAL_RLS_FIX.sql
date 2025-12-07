-- CRITICAL FIX: Anonymous Chat RLS Policies & Realtime Setup
-- Run this ENTIRE script in Supabase SQL Editor

-- ============================================================
-- PART 1: VERIFY CURRENT STATE
-- ============================================================

-- Check if RLS is enabled on anonymous_chat_messages
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'anonymous_chat_messages';

-- Check existing policies
SELECT tablename, policyname, permissive, qual, with_check
FROM pg_policies
WHERE tablename = 'anonymous_chat_messages'
ORDER BY policyname;

-- Check if realtime is enabled (go to Supabase UI to check)
-- Path: Database > Replication > Check if anonymous_chat_messages has INSERT/UPDATE checked

-- ============================================================
-- PART 2: DROP OLD POLICIES (if they exist and are broken)
-- ============================================================

DROP POLICY IF EXISTS "Users can send messages in their sessions" ON anonymous_chat_messages;
DROP POLICY IF EXISTS "Users can view messages in their sessions" ON anonymous_chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON anonymous_chat_messages;

-- ============================================================
-- PART 3: ENABLE RLS (if not already enabled)
-- ============================================================

ALTER TABLE anonymous_chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 4: CREATE NEW, WORKING POLICIES
-- ============================================================

-- POLICY 1: Users can INSERT (send) messages if they are in a paired session
-- This is the CRITICAL one for message sending
CREATE POLICY "Users can send messages in their sessions"
  ON anonymous_chat_messages
  FOR INSERT
  WITH CHECK (
    -- The message must be from the current user
    auth.uid() = sender_id
    AND
    -- The user must be in a session (paired)
    EXISTS (
      SELECT 1 FROM anonymous_chat_sessions
      WHERE 
        session_id = anonymous_chat_messages.session_id
        AND status = 'paired'
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

-- POLICY 2: Users can SELECT (view) messages from their sessions
CREATE POLICY "Users can view messages in their sessions"
  ON anonymous_chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM anonymous_chat_sessions
      WHERE 
        session_id = anonymous_chat_messages.session_id
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

-- POLICY 3: Users can DELETE their own messages
CREATE POLICY "Users can delete their own messages"
  ON anonymous_chat_messages
  FOR DELETE
  USING (sender_id = auth.uid());

-- ============================================================
-- PART 5: VERIFY POLICIES WERE CREATED
-- ============================================================

SELECT tablename, policyname, permissive, qual, with_check
FROM pg_policies
WHERE tablename = 'anonymous_chat_messages'
ORDER BY policyname;

-- Should show 3 policies all with permissive = true

-- ============================================================
-- PART 6: TEST POLICIES (OPTIONAL - for debugging)
-- ============================================================

-- First, get your user ID:
SELECT auth.uid() as current_user_id;

-- Get your latest session ID:
SELECT 
  session_id,
  user1_id,
  user2_id,
  status
FROM anonymous_chat_sessions
WHERE user1_id = auth.uid() OR user2_id = auth.uid()
ORDER BY created_at DESC
LIMIT 1;

-- If you have a session ID and it's 'paired', try this test:
-- INSERT INTO anonymous_chat_messages (session_id, sender_id, content)
-- VALUES (
--   'your-session-id-here',
--   auth.uid(),
--   'Test message from SQL editor'
-- )
-- RETURNING *;

-- If INSERT works, check if message appears:
-- SELECT * FROM anonymous_chat_messages 
-- WHERE session_id = 'your-session-id-here'
-- ORDER BY created_at DESC;

-- ============================================================
-- PART 7: CRITICAL - CHECK REALTIME PUBLICATION
-- ============================================================

-- Check if anonymous_chat_messages table is published for realtime
-- If you see 0 rows below, REALTIME IS NOT ENABLED!
SELECT schemaname, tablename, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'anonymous_chat_messages'
ORDER BY ordinal_position;

-- To enable realtime:
-- 1. Go to Supabase Dashboard
-- 2. Click: Database > Replication
-- 3. Find: anonymous_chat_messages
-- 4. Check: INSERT, UPDATE (under "authenticated")
-- 5. Click: Save

-- ============================================================
-- PART 8: MANUAL REALTIME TEST (if you want to verify realtime works)
-- ============================================================

-- After running this, go to another SQL tab/window and run:
-- INSERT INTO anonymous_chat_messages (session_id, sender_id, content)
-- VALUES ('anon_6825a5e9-28b3-41de-b5a8-79367f9a1807', auth.uid(), 'Test')
-- RETURNING *;

-- You should see the notification appear in real-time in this window!

-- Actually subscribe in real-time (this will hang until you insert a message)
-- LISTEN anonymous_chat_messages_changes;

