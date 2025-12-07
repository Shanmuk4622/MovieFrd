-- Enable Realtime for Anonymous Chat Messages Table
-- This script will enable the realtime publication for the anonymous_chat_messages table

-- ============================================================
-- STEP 1: Check current realtime publications
-- ============================================================

-- List all tables currently published for realtime
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- ============================================================
-- STEP 2: Enable realtime for anonymous_chat_messages
-- ============================================================

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE anonymous_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE anonymous_chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE anonymous_chat_archive;

-- ============================================================
-- STEP 3: Verify the tables are now published
-- ============================================================

-- Check that the tables are now in the publication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename LIKE 'anonymous%'
ORDER BY tablename;

-- Expected output: 3 rows (all anonymous_chat_* tables)

-- ============================================================
-- DONE! Realtime is now enabled for all anonymous chat tables
-- ============================================================

-- Now you can:
-- 1. Reload your app (Ctrl+R)
-- 2. Test messaging between 2 devices
-- 3. Messages should sync in real-time!

