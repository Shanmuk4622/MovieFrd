# Anonymous Chat Troubleshooting Checklist

## Current Status
- ✅ Dev server running: http://localhost:3001
- ⚠️ Functionality not working

## Steps to Diagnose

### 1. Check Supabase SQL was executed
Run this in Supabase SQL Editor to verify the function exists:
```sql
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'find_anonymous_chat_partner';
```
**Expected:** Should return 1 row showing the function exists

### 2. Test the function directly in SQL
```sql
SELECT * FROM find_anonymous_chat_partner();
```
**Expected:** Should return a session_id with no errors

### 3. Check tables exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE 'anonymous_chat%';
```
**Expected:** Should show 3 tables (sessions, messages, archive)

### 4. Check browser console
Open browser console (F12) and look for:
- ❌ Red error messages
- ⚠️ Yellow warnings
- 🔍 Network tab: Check for failed requests (red)

### 5. Test step-by-step

**Device 1:**
1. Go to http://localhost:3001
2. Login as User 1
3. Go to Chat section
4. Click "Find Stranger" button
5. **Check console** - should see log: "Session update:" or similar
6. Should show "Finding a stranger..." animation

**Device 2 (or incognito window):**
1. Go to http://localhost:3001
2. Login as User 2 (different user!)
3. Go to Chat section  
4. Click "Find Stranger" button
5. **Both should be paired instantly!**

### 6. Common Issues & Solutions

#### Issue: Nothing happens when clicking "Find Stranger"
**Check:** Browser console for errors
**Solution:** 
- Make sure you ran the SQL function fix
- Check Supabase logs for RPC errors

#### Issue: Stuck on "Finding a stranger..."
**Cause:** No other user is searching
**Solution:** Open a second browser/incognito with different user

#### Issue: "Permission denied" or 406 error
**Cause:** RLS policies blocking
**Solution:** Run `final_fix.sql` in Supabase SQL Editor

#### Issue: Messages not sending
**Cause:** RLS policy on anonymous_chat_messages
**Check:** In Supabase, go to Database > Policies > anonymous_chat_messages
**Solution:** Make sure "Users can send messages in their sessions" policy exists

### 7. Debug with SQL queries

**Check if sessions are being created:**
```sql
SELECT * FROM anonymous_chat_sessions 
ORDER BY created_at DESC 
LIMIT 5;
```

**Check if you have an active session:**
```sql
SELECT * FROM anonymous_chat_sessions 
WHERE (user1_id = 'YOUR_USER_ID' OR user2_id = 'YOUR_USER_ID')
  AND status IN ('waiting', 'paired');
```
(Replace YOUR_USER_ID with your actual user ID)

**Clean up stuck sessions:**
```sql
DELETE FROM anonymous_chat_sessions 
WHERE status = 'waiting' 
  AND created_at < NOW() - INTERVAL '5 minutes';
```

### 8. Get your User ID
Open browser console and run:
```javascript
(await supabase.auth.getUser()).data.user.id
```

Or check in Supabase Dashboard > Authentication > Users

## Quick Reset

If everything is broken, run this to start fresh:

```sql
-- Clean up all sessions
DELETE FROM anonymous_chat_messages;
DELETE FROM anonymous_chat_sessions;

-- Test the function
SELECT * FROM find_anonymous_chat_partner();
```

## Need More Help?

Share these from your browser console (F12):
1. Any red error messages (full text)
2. Network tab: Any failed requests (show URL and status code)
3. Result of: `SELECT * FROM find_anonymous_chat_partner();` from Supabase SQL Editor

---

**Your app is at:** http://localhost:3001
