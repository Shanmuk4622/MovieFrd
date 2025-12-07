-- COMPREHENSIVE: Diagnose and Fix Realtime Setup
-- Run this to check and fix realtime publication

-- ============================================================
-- PART 1: DIAGNOSE CURRENT STATE
-- ============================================================

-- Check if supabase_realtime publication exists
SELECT pubname, pubowner, puballtables
FROM pg_publication
WHERE pubname = 'supabase_realtime';

-- Check all tables currently in the publication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Check if our specific tables exist in the database
SELECT schemaname, tablename 
FROM pg_tables 
WHERE tablename LIKE 'anonymous%'
ORDER BY tablename;

-- Check if our tables have the realtime extension enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename LIKE 'anonymous%'
ORDER BY tablename;

-- ============================================================
-- PART 2: CREATE PUBLICATION IF IT DOESN'T EXIST
-- ============================================================

-- Create the realtime publication if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- ============================================================
-- PART 3: ADD TABLES TO PUBLICATION
-- ============================================================

-- Remove existing entries (if any) to avoid duplicates
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS anonymous_chat_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS anonymous_chat_sessions;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS anonymous_chat_archive;

-- Add all three tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE anonymous_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE anonymous_chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE anonymous_chat_archive;

-- ============================================================
-- PART 4: VERIFY EVERYTHING IS SET UP
-- ============================================================

-- Show all tables in the realtime publication
SELECT 
  schemaname,
  tablename,
  CASE WHEN tablename LIKE 'anonymous%' THEN '✅ OUR TABLE' ELSE '📦 OTHER' END as type
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Count: should include our 3 anonymous_chat_* tables
SELECT COUNT(*) as total_tables_in_realtime
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- Double-check our 3 tables specifically
SELECT 
  tablename,
  CASE 
    WHEN tablename = 'anonymous_chat_messages' THEN '✅ CRITICAL FOR MESSAGING'
    WHEN tablename = 'anonymous_chat_sessions' THEN '✅ FOR PAIRING'
    WHEN tablename = 'anonymous_chat_archive' THEN '✅ FOR ARCHIVING'
    ELSE 'UNKNOWN'
  END as purpose
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename LIKE 'anonymous%'
ORDER BY tablename;

-- ============================================================
-- PART 5: SUCCESS CHECKS
-- ============================================================

-- If you see output showing these 3 tables:
-- - anonymous_chat_archive ✅
-- - anonymous_chat_messages ✅  
-- - anonymous_chat_sessions ✅
-- 
-- Then realtime is successfully enabled! 🎉

-- Next steps:
-- 1. Reload your app (Ctrl+R)
-- 2. Open 2 browser tabs with different user accounts
-- 3. Click "Find Stranger" on both
-- 4. Send a message - should sync instantly!

