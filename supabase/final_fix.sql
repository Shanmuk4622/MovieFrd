-- Final Fix for Anonymous Chat Pairing Issue
-- Run this in Supabase SQL Editor

-- Problem: RLS is blocking reads when user2 tries to see a session where they're being added
-- Solution: Make the SELECT policy more permissive

DROP POLICY IF EXISTS "Users can view their own anonymous sessions" ON anonymous_chat_sessions;
DROP POLICY IF EXISTS "Users can update their sessions" ON anonymous_chat_sessions;

-- Allow viewing sessions where you're user1, user2, OR where you might be added as user2
CREATE POLICY "Users can view their own anonymous sessions"
  ON anonymous_chat_sessions FOR SELECT
  USING (
    auth.uid() = user1_id OR 
    auth.uid() = user2_id OR
    -- Allow seeing waiting sessions (for potential pairing)
    (status = 'waiting' AND user2_id IS NULL)
  );

-- Allow updating for pairing and ending
CREATE POLICY "Users can update their sessions"
  ON anonymous_chat_sessions FOR UPDATE
  USING (
    -- Can see the session to update it
    auth.uid() = user1_id OR 
    auth.uid() = user2_id OR
    -- OR it's a waiting session you can join
    (status = 'waiting' AND user2_id IS NULL)
  );

-- Test the function
SELECT * FROM find_anonymous_chat_partner();
