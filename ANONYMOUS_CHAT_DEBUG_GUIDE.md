# Anonymous Chat Message Delivery - Comprehensive Troubleshooting

## Issue: Messages paired but not appearing in chat

### Quick Diagnosis Steps

**Step 1: Check Console Logs**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for logs starting with `[AnonymousChat]` and `[sendAnonymousMessage]`
4. You should see:
   - `[AnonymousChat] Starting search...`
   - `[AnonymousChat] Partner search result: {session_id, partner_id, ...}`
   - `[AnonymousChat] Sending message: [your message]`
   - `[sendAnonymousMessage] Message sent successfully: {id, session_id, ...}`
   - `[AnonymousChat] New message received: {eventType: 'INSERT', ...}`

**If you don't see the "Message sent successfully" log:**
→ Problem is message insertion failing (RLS policy issue)

**If you see "Message sent successfully" but not "New message received":**
→ Problem is realtime subscription not firing

---

## Detailed Diagnosis

### Issue A: Message Not Being Inserted (RLS Policy Blocking)

**Check in Supabase Dashboard:**

1. Go to `SQL Editor`
2. Run the diagnostic query:
```sql
-- Check your user ID and current session
SELECT auth.uid() as my_user_id;

-- List all anonymous chat sessions
SELECT id, session_id, user1_id, user2_id, status, created_at 
FROM anonymous_chat_sessions 
ORDER BY created_at DESC 
LIMIT 5;
```

3. Find your session ID from above
4. Check if messages were inserted:
```sql
SELECT * FROM anonymous_chat_messages 
WHERE session_id = 'YOUR_SESSION_ID_HERE'
ORDER BY created_at DESC;
```

If the query returns 0 rows after you tried sending messages, the INSERT is being blocked.

**Fix: Run the RLS policy fix**

Copy the contents of `supabase/fix_message_insertion.sql` and run it in Supabase SQL Editor.

---

### Issue B: Realtime Not Firing

**Check if realtime is enabled:**

1. Go to Supabase Dashboard
2. Navigate to: **Database > Replication**
3. Look for `anonymous_chat_messages` table
4. Check that it has checkmarks in columns:
   - ✅ INSERT (required for new messages)
   - ✅ UPDATE (if updating messages)
5. Make sure "authenticated" is selected

**If not checked, enable it:**
1. Click the table name to edit
2. Check the "INSERT" box
3. Save

**Test realtime manually:**
1. Open SQL Editor
2. Subscribe to the table in one window
3. Insert a message in another window
4. Should see the notification in the first window

---

### Issue C: Message Sending But Not Being Saved

**Debug with console logs:**

Check your browser console for these logs in order:
1. ✅ `[sendAnonymousMessage] Starting - Session: xxx`
2. ✅ `[sendAnonymousMessage] User session: [your-user-id]`
3. ✅ `[sendAnonymousMessage] Attempting to insert: {session_id, sender_id, content, ...}`
4. ❌ If you see an error here, it's the RLS policy

**Common RLS Errors:**
- "new row violates row-level security policy" - INSERT policy blocking
- "FOREIGN KEY constraint failed" - Session doesn't exist
- "permission denied for schema public" - Role issues

---

## Manual Testing Steps

### Test 1: Check Session Status
```sql
-- Make sure your session is 'paired'
SELECT session_id, user1_id, user2_id, status 
FROM anonymous_chat_sessions 
WHERE session_id = 'YOUR_SESSION_ID'
LIMIT 1;

-- Status should be 'paired', not 'waiting' or 'ended'
```

### Test 2: Test Message Insert Directly
```sql
-- Replace YOUR_SESSION_ID with actual ID
INSERT INTO anonymous_chat_messages (session_id, sender_id, content)
VALUES (
  'YOUR_SESSION_ID',
  auth.uid(),
  'Test message'
)
RETURNING *;

-- If this fails, RLS policy needs fixing
-- If successful, problem is async/realtime
```

### Test 3: Check RLS Policies Exist
```sql
SELECT tablename, policyname, qual
FROM pg_policies
WHERE tablename = 'anonymous_chat_messages'
ORDER BY policyname;

-- Should show at least one INSERT policy
```

### Test 4: Verify Realtime Is On
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'anonymous_chat_messages';

-- rowsecurity should be 't' (true)
```

---

## What Each Component Should Do

### 1. `handleSendMessage()` in AnonymousChat.tsx
- Gets session_id from state
- Calls `sendAnonymousMessage()`
- Expects message back (via realtime, not directly)
- Shows console logs

### 2. `sendAnonymousMessage()` in supabaseApi.ts
- Gets current user from auth.getSession()
- Inserts into `anonymous_chat_messages` table
- Has `sender_id = user.id` check
- Throws error if RLS fails
- Returns the inserted message

### 3. Realtime Subscription in setupRealtime()
- Subscribes to INSERT events on `anonymous_chat_messages`
- Filters by `session_id` matching current session
- Callback fires when new message is inserted
- Adds message to state

---

## Quick Fixes to Try

**Fix 1: Run RLS Policy Script**
```
Location: supabase/fix_message_insertion.sql
Action: Copy all content and run in Supabase SQL Editor
Expected: No errors, policies created successfully
```

**Fix 2: Enable Realtime on Table**
```
Location: Supabase Dashboard > Database > Replication
Action: Check INSERT checkbox for anonymous_chat_messages
Expected: Anonymous chat messages start appearing instantly
```

**Fix 3: Clear Browser Cache and Reload**
```
Action: Hard refresh (Ctrl+Shift+R)
Expected: Fresh connection to realtime
```

---

## Still Not Working?

### Collect Diagnostics
1. Open DevTools Console
2. Try sending a message
3. Copy all logs starting with `[Anonymous`
4. Check if you see:
   - "Message sent successfully" - messages ARE being saved
   - OR error about RLS policy

### Check Database Directly
```sql
-- Run this after trying to send a message
SELECT COUNT(*) as message_count 
FROM anonymous_chat_messages 
WHERE session_id = 'YOUR_SESSION_ID';

-- If count increased: messages are being saved, realtime is the issue
-- If count stayed same: messages not being inserted, RLS is the issue
```

### Run the Full Diagnostic
Copy and run `fix_message_insertion.sql` which includes:
- Drop and recreate all RLS policies
- Enable RLS on table
- Setup proper INSERT/SELECT/DELETE policies
- Includes manual test queries

---

## Expected Workflow After Fix

1. **User A clicks "Find Stranger"**
   - Search starts (status = waiting)
   
2. **User B clicks "Find Stranger"**
   - Matched with User A (status = paired)
   - Both see "Stranger Connected"
   
3. **User A sends "Hello"**
   - Console: `[sendAnonymousMessage] Message sent successfully`
   - Message inserted into DB
   - Realtime fires INSERT event
   
4. **User B receives message**
   - Realtime fires on User B's device
   - Message added to state
   - Appears in chat UI
   
5. **User B types reply**
   - Same process in reverse

---

## Reference: Database Schema

**Table: anonymous_chat_sessions**
- session_id (UUID, PK)
- user1_id (UUID, FK to profiles)
- user2_id (UUID, FK to profiles, nullable)
- status ('waiting' | 'paired' | 'ended')
- created_at, paired_at, ended_at, ended_by

**Table: anonymous_chat_messages**
- id (UUID, PK)
- session_id (UUID, FK)
- sender_id (UUID, FK to profiles)
- content (text)
- created_at (timestamp)

**Table: anonymous_chat_archive**
- id (UUID, PK)
- session_id (UUID)
- user1_id, user2_id (UUID)
- messages (JSONB array)
- created_at, ended_at

---

## Key Points to Remember

1. **Messages go to `anonymous_chat_messages` table first** (not archive)
2. **Archive is only for ended sessions** (automatic cleanup)
3. **Realtime fires on INSERT** (not SELECT)
4. **RLS must allow INSERT** for message sending
5. **Realtime must be ENABLED** on the table
6. **Session must be 'paired'** to send messages (not 'waiting' or 'ended')
