# Anonymous 1-on-1 Chat Feature Setup Guide

## Overview
This feature implements an Omegle-like anonymous chat system where users can:
- Connect with random strangers for temporary 1-on-1 chats
- Skip to find a new partner
- See typing indicators
- Have chats automatically archived when disconnected
- Messages disappear from active view but are saved in an archive table

## Database Setup

### Step 1: Run the SQL Migration

You need to execute the SQL script in your Supabase SQL Editor:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **"New Query"**
4. Copy the entire contents of `supabase/anonymous_chat.sql`
5. Paste and click **"Run"**

This will create:
- **Tables**:
  - `anonymous_chat_sessions` - Tracks active and ended chat sessions
  - `anonymous_chat_messages` - Stores temporary messages
  - `anonymous_chat_archive` - Archives completed chats
  
- **Functions**:
  - `find_anonymous_chat_partner()` - Matchmaking algorithm
  - `end_anonymous_chat_session()` - Ends and archives sessions
  - `cleanup_old_anonymous_sessions()` - Cleanup utility
  - `get_user_anonymous_archive()` - Retrieve user's chat history
  
- **RLS Policies** - Row-level security for all tables

### Step 2: Verify Tables Were Created

Run this query in SQL Editor to verify:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE 'anonymous_chat%';
```

You should see 3 tables.

### Step 3: Test Database Functions

Test the matchmaking function:

```sql
SELECT * FROM find_anonymous_chat_partner();
```

This should return a session with `session_id`, `partner_id` (null if waiting), and `is_new_session`.

## How It Works

### User Flow

1. **Click "Find Stranger" button** in the chat sidebar
2. **Searching state**: System looks for waiting users or creates a new session
3. **Paired state**: When matched, both users can chat in real-time
4. **Skip/End**: Either user can skip to find new partner or end chat
5. **Archive**: Chat is automatically saved when session ends

### Features

✅ **Random Pairing** - Users are matched with available strangers  
✅ **Real-time Messaging** - Instant message delivery via Supabase Realtime  
✅ **Typing Indicators** - See when partner is typing  
✅ **Anonymous Identities** - Users are labeled as "Stranger 1" and "Stranger 2"  
✅ **Skip Function** - Find a new partner instantly  
✅ **Auto-Archive** - Chats saved when either user disconnects  
✅ **Temporary Data** - Messages deleted from active table, saved in archive  
✅ **Disconnect Detection** - Shows when partner leaves

### Database Schema

#### anonymous_chat_sessions
```
- id: UUID (primary key)
- session_id: TEXT (unique, format: anon_<uuid>)
- user1_id: UUID (first user)
- user2_id: UUID (second user, null if waiting)
- status: TEXT (waiting | paired | ended)
- created_at: TIMESTAMPTZ
- paired_at: TIMESTAMPTZ (when matched)
- ended_at: TIMESTAMPTZ
- ended_by: UUID (who ended the chat)
```

#### anonymous_chat_messages
```
- id: BIGSERIAL (primary key)
- session_id: TEXT (foreign key)
- sender_id: UUID
- content: TEXT
- created_at: TIMESTAMPTZ
- is_typing: BOOLEAN
```

#### anonymous_chat_archive
```
- id: UUID (primary key)
- session_id: TEXT
- user1_id: UUID
- user2_id: UUID
- messages: JSONB (all messages as JSON array)
- started_at: TIMESTAMPTZ
- ended_at: TIMESTAMPTZ
- message_count: INT
- archived_at: TIMESTAMPTZ
```

## Usage

### For Users

1. Open the Chat page
2. Look for the purple "Find Stranger" button in the sidebar (below Anonymous Rooms)
3. Click it to start searching
4. Wait to be paired (or be paired instantly if someone is waiting)
5. Chat with your random partner
6. Use "Skip" to find a new partner or "End Chat" to disconnect

### For Developers

#### API Functions (supabaseApi.ts)

```typescript
// Find or join a chat session
const result = await findAnonymousChatPartner();

// Get active session
const session = await getActiveAnonymousSession();

// Get messages
const messages = await getAnonymousChatMessages(sessionId);

// Send message
await sendAnonymousMessage(sessionId, content);

// End session
await endAnonymousSession(sessionId);

// Get archive
const archive = await getAnonymousChatArchive();

// Subscribe to realtime updates
const channel = subscribeToAnonymousSession(sessionId, callback);
const msgChannel = subscribeToAnonymousMessages(sessionId, callback);
const typingChannel = subscribeToAnonymousTyping(sessionId, callback);
```

## Security

- **RLS Policies** ensure users only see their own sessions and messages
- **Anonymous identities** - Real usernames/profiles are not exposed
- **Automatic cleanup** - Old ended sessions are deleted after 1 hour
- **Archive only** - No permanent message storage in active tables

## Troubleshooting

### Issue: "Find Stranger" button doesn't respond
- Check browser console for errors
- Verify SQL migration ran successfully
- Check Supabase logs for RPC errors

### Issue: Not getting paired
- Ensure at least 2 users are searching simultaneously
- Check `anonymous_chat_sessions` table for waiting sessions:
  ```sql
  SELECT * FROM anonymous_chat_sessions WHERE status = 'waiting';
  ```

### Issue: Messages not appearing
- Check Realtime is enabled in Supabase project settings
- Verify `anonymous_chat_messages` table has messages:
  ```sql
  SELECT * FROM anonymous_chat_messages WHERE session_id = 'your_session_id';
  ```

### Issue: Chat doesn't end properly
- Manually end via SQL if needed:
  ```sql
  SELECT end_anonymous_chat_session('your_session_id');
  ```

## Maintenance

### Cleanup Old Sessions

Run periodically (can set up as a cron job):

```sql
SELECT cleanup_old_anonymous_sessions();
```

This deletes ended sessions older than 1 hour.

### View Archive

See all archived chats:

```sql
SELECT 
  session_id,
  message_count,
  started_at,
  ended_at,
  EXTRACT(EPOCH FROM (ended_at - started_at))/60 as duration_minutes
FROM anonymous_chat_archive
ORDER BY ended_at DESC;
```

## Future Enhancements

Potential improvements:
- Interest-based matching
- Language preferences
- Report/block functionality
- Common interests displayed when paired
- Video/audio chat support
- Geographic matching options

---

**Note**: This feature is designed for temporary, ephemeral conversations. All chats are archived but messages are deleted from active tables when sessions end.
