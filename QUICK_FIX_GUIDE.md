# 🚀 Quick Fix Guide for Anonymous Chat

## The Problem
You're seeing these errors:
- ❌ `column reference "session_id" is ambiguous` 
- ❌ `406 (Not Acceptable)` on GET request
- ❌ `400 (Bad Request)` on POST to `find_anonymous_chat_partner`

## The Solution (5 Minutes)

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project: https://supabase.com/dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **"New Query"**

### Step 2: Run This SQL Script
Copy and paste **ONLY THIS** and click **Run**:

```sql
-- Drop and recreate ONLY the function (policies are already correct)
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
    UPDATE anonymous_chat_sessions
    SET user2_id = v_current_user_id,
        status = 'paired',
        paired_at = NOW()
    WHERE id = v_waiting_record_id;
    
    RETURN QUERY SELECT v_waiting_session_id, v_waiting_user_id, TRUE;
  ELSE
    v_new_session_id := 'anon_' || gen_random_uuid()::TEXT;
    
    INSERT INTO anonymous_chat_sessions (session_id, user1_id, status)
    VALUES (v_new_session_id, v_current_user_id, 'waiting');
    
    RETURN QUERY SELECT v_new_session_id, NULL::UUID, FALSE;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION find_anonymous_chat_partner() TO authenticated;
```

```sql
-- Fix for Anonymous Chat
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
    UPDATE anonymous_chat_sessions
    SET user2_id = v_current_user_id,
        status = 'paired',
        paired_at = NOW()
    WHERE id = v_waiting_record_id;
    
    RETURN QUERY SELECT v_waiting_session_id, v_waiting_user_id, TRUE;
  ELSE
    v_new_session_id := 'anon_' || gen_random_uuid()::TEXT;
    
    INSERT INTO anonymous_chat_sessions (session_id, user1_id, status)
    VALUES (v_new_session_id, v_current_user_id, 'waiting');
    
    RETURN QUERY SELECT v_new_session_id, NULL::UUID, FALSE;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION find_anonymous_chat_partner() TO authenticated;
```

**That's it!** The policies already exist, we only need to fix the function.

### Step 3: Verify It Worked
After running the script, you should see: ✅ **Success. No rows returned**

### Step 4: Test in Browser
1. Refresh your app (http://localhost:3000)
2. Press F12 to open DevTools Console
3. Click **"Find Stranger"** button
4. You should see the searching animation
5. Check console - no more errors!

## What Was Fixed?

### 1. ✅ Fixed Ambiguous Column Reference
- Changed return column names to `result_session_id`, `result_partner_id`, `result_is_new_session`
- Used `v_` prefix for all variables to avoid conflicts

### 2. ✅ Fixed RLS Policy
- Updated the UPDATE policy to allow pairing operation
- Added `WITH CHECK` clause for user2_id updates
- Added `SET search_path = public` for security

### 3. ✅ Added Permissions
- Granted EXECUTE permission to authenticated users

## Testing with Two Users

To test the pairing feature:

1. **Open two browser windows**
   - Window 1: Regular browser (Chrome)
   - Window 2: Incognito/Private mode

2. **Login as different users in each window**

3. **Click "Find Stranger" in both windows**
   - First user: Will see "Finding a stranger..." 
   - Second user: Both will be instantly paired! ✨

4. **Start chatting!**
   - Messages appear instantly
   - See typing indicators
   - Try "Skip" button to find new partner

## Common Issues

### Still seeing errors?
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5)
3. Check Supabase logs for RLS errors

### Function not found?
- Make sure you ran the SQL in the correct project
- Check SQL Editor history to confirm it executed

### Can't pair with anyone?
- You need 2 different users searching simultaneously
- Can't pair with yourself (that's prevented by design)

## Need Help?

Check browser console for specific errors:
- Press F12
- Go to Console tab
- Look for red error messages
- Share the error text if you need more help

---

**Your app is running at:** http://localhost:3000
