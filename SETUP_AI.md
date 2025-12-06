# Quick Start: AI Friend Recommendations

## What Changed?
Your "People You May Know" section now uses **Google Gemini AI** instead of simple database queries. The AI analyzes the **entire community's movie preferences** to recommend friends with shared interests.

## 3-Minute Setup

### 1. Get Gemini API Key
- Go to [Google AI Studio](https://aistudio.google.com/app/apikeys)
- Click "Create API Key" (it's free with usage limits)
- Copy the key

### 2. Add to `.env.local`
In your project root, create or update `.env.local`:
```
VITE_GEMINI_API_KEY=paste_your_key_here
```

### 3. Restart Dev Server
```bash
npm run dev
```

## That's it! 🎉
Go to Profile → "People You May Know" to see AI-powered recommendations.

## What Data Goes to Gemini?
- **Your watched movies** (titles/IDs only)
- **Your watchlist** (titles/IDs only)  
- **Community stats** (usernames, movie counts, friend counts)
- **Other users' movies** (no personal data, just viewing patterns)

**No sensitive data** (emails, passwords, passwords) is sent.

## Troubleshooting

**Error: "Could not load recommendations"**
- Check your API key is correct in `.env.local`
- Verify you have watched at least 1 movie
- Check browser console for details

**Slow to load**
- First load may take 2-3 seconds (Gemini API call)
- This is normal
- Results improve with more community data

## How It Works
1. Collects community movie data (anonymized)
2. Sends to Gemini with a prompt to find best matches
3. Gemini analyzes shared interests, compatibility, community fit
4. Returns ranked list with explanations
5. App displays top 10 with "Show All" button

See `AI_RECOMMENDATIONS.md` for detailed documentation.
