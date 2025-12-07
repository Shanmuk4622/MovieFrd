# ⚡ QUICK START - Enable Realtime (Copy-Paste)

## 🎯 3 Simple Steps

### Step 1: Open Supabase SQL Editor
```
Dashboard → SQL Editor → + New Query
```

### Step 2: Copy This Code

```sql
-- Enable Realtime for Anonymous Chat
ALTER PUBLICATION supabase_realtime ADD TABLE anonymous_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE anonymous_chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE anonymous_chat_archive;

-- Verify
SELECT tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename LIKE 'anonymous%';
```

### Step 3: Run It
- Click **green play button** ▶️
- Or press **Ctrl+Enter**

---

## ✅ You Should See This

```
tablename
-----------------------------------
anonymous_chat_archive
anonymous_chat_messages
anonymous_chat_sessions
```

**If you see these 3 → DONE!** ✅

---

## 🧪 Now Test

1. Reload your app: **Ctrl+Shift+R**
2. Open 2 tabs
3. Different user on each tab
4. Click "Find Stranger" on both
5. Send message
6. **Should appear instantly on other tab!**

---

## 🎉 That's It!

You just enabled realtime messaging for your anonymous chat feature!

Messages will now sync in real-time between devices. ✨

