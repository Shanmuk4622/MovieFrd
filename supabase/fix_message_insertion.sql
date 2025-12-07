-- Debug and Fix Anonymous Chat Message Insertion
-- Run this to diagnose and fix message insertion issues

-- First, check existing policies on anonymous_chat_messages table
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE tablename = 'anonymous_chat_messages'
ORDER BY policyname;

-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'anonymous_chat_messages'
ORDER BY ordinal_position;

-- Check if RLS is enabled on the table
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'anonymous_chat_messages';

-- ============================================
-- IF POLICIES DON'T EXIST OR ARE BROKEN, RUN BELOW:
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can send messages in their sessions" ON anonymous_chat_messages;
DROP POLICY IF EXISTS "Users can view messages in their sessions" ON anonymous_chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON anonymous_chat_messages;

-- Enable RLS on the table (if not already enabled)
ALTER TABLE anonymous_chat_messages ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY FOR SENDING MESSAGES (INSERT)
CREATE POLICY "Users can send messages in their sessions"
  ON anonymous_chat_messages FOR INSERT
  WITH CHECK (
    -- User can send if they are in a paired session
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM anonymous_chat_sessions
      WHERE (
        anonymous_chat_sessions.session_id = anonymous_chat_messages.session_id AND
        (
          -- User is one of the participants
          (anonymous_chat_sessions.user1_id = auth.uid() OR anonymous_chat_sessions.user2_id = auth.uid()) AND
          -- Session is paired
          anonymous_chat_sessions.status = 'paired'
        )
      )
    )
  );

-- CREATE POLICY FOR VIEWING MESSAGES (SELECT)
CREATE POLICY "Users can view messages in their sessions"
  ON anonymous_chat_messages FOR SELECT
  USING (
    -- User can view if they are in the session
    EXISTS (
      SELECT 1 FROM anonymous_chat_sessions
      WHERE (
        anonymous_chat_sessions.session_id = anonymous_chat_messages.session_id AND
        (
          anonymous_chat_sessions.user1_id = auth.uid() OR 
          anonymous_chat_sessions.user2_id = auth.uid()
        )
      )
    )
  );

-- CREATE POLICY FOR DELETING MESSAGES (DELETE)
CREATE POLICY "Users can delete their own messages"
  ON anonymous_chat_messages FOR DELETE
  USING (sender_id = auth.uid());

-- Test: Try inserting a message manually (replace with real IDs)
-- This helps diagnose if the issue is with RLS or realtime
-- SELECT auth.uid(); -- First run this to get your user ID
-- Then run:
-- INSERT INTO anonymous_chat_messages (session_id, sender_id, content)
-- SELECT 
--   'your-session-id-here',
--   auth.uid(),
--   'Test message from policy fix'
-- WHERE EXISTS (
--   SELECT 1 FROM anonymous_chat_sessions
--   WHERE session_id = 'your-session-id-here'
--   AND status = 'paired'
--   AND (user1_id = auth.uid() OR user2_id = auth.uid())
-- );

-- Verify realtime is enabled for this table
-- Go to Supabase Dashboard > Database > Replication
-- Check if "anonymous_chat_messages" is in the "Insert" column for authenticated users
