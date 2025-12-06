# AI-Powered Friend Recommendations

## Overview
The MovieFrd app now features an intelligent, AI-powered friend recommendation system powered by **Google Gemini**. Instead of simple database queries, the system analyzes **entire community data** and generates personalized recommendations based on shared movie interests, viewing patterns, and social connections.

## How It Works

### 1. **Community Data Collection**
When generating recommendations, the system collects:
- **Movie preferences** from all community members:
  - Watched movies (completed lists)
  - Watchlist movies (movies users plan to watch)
- **Social metrics**:
  - Friend count per user (social reach)
  - Connection patterns within the community
- **User metadata**:
  - Usernames and IDs
  - Viewing history size

### 2. **AI Analysis with Gemini**
The collected community data is sent to **Google Gemini 2.0 Flash** with a detailed prompt that asks it to:
- **Identify shared interests**: Find users who have watched the same movies
- **Detect complementary tastes**: Recommend users whose watchlist aligns with your watched movies
- **Assess community fit**: Consider social connectivity and activity levels
- **Generate compatibility scores**: Rate each potential friend on a 0-100 scale

### 3. **Intelligent Ranking**
Gemini returns ranked recommendations with:
- **User ID**: The potential friend's identifier
- **Compatibility Score** (0-100): How well your movie tastes match
- **Reason**: A brief explanation of why they'd be a good friend

### 4. **Profile Fetching & Display**
Top 10 recommendations are fetched from the database and displayed with:
- User avatar
- Username
- Add friend button
- "Show All" feature if more than 10 recommendations exist

## Setup Instructions

### Step 1: Get Your Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikeys)
2. Click "Create API Key"
3. Copy your API key

### Step 2: Configure Environment Variables
Create or update `.env.local` in the project root:
```
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### Step 3: Restart the Development Server
```bash
npm run dev
```

## System Architecture

```
Profile Component
    ↓
FriendRecommendations.tsx (Component)
    ↓
generateAIPoweredRecommendations() (Service)
    ├── Collect Community Data
    │   └── Query all users' movies, watchlists, friend counts
    ├── Prepare Current User Data
    │   └── Filter watched vs. watchlist items
    ├── Create Gemini Prompt
    │   └── Compile comprehensive community context
    ├── Call Gemini API
    │   └── AI analyzes & returns ranked recommendations
    ├── Parse AI Response
    │   └── Extract user IDs, scores, reasons
    └── Fetch Full Profiles
        └── Display recommendations to user
```

## Recommendation Algorithm Details

### Gemini Prompt Structure
The system sends a structured prompt containing:
1. **Current User Profile**
   - Username
   - Watched movies (up to 20 most recent)
   - Watchlist (up to 20 items)

2. **Potential Friends List**
   - Each potential friend's username
   - Their watched movie count and samples
   - Their watchlist count and samples
   - Their friend count (social connectivity)

3. **Community Statistics**
   - Total user count
   - Average movies watched per user
   - Average friend connections per user

4. **Recommendation Criteria** (prioritized)
   - Movie taste alignment (shared watched movies)
   - Complementary interests (watchlist overlap)
   - Social reach (friend count indicates activity)
   - Community fit (overall diversity/engagement)

### Example Output
```json
[
  {
    "userId": "john_doe",
    "compatibility_score": 85,
    "reason": "Shares 5 watched movies including Inception and Interstellar. Your watchlist aligns with their interests in sci-fi."
  },
  {
    "userId": "jane_smith",
    "compatibility_score": 72,
    "reason": "Active community member with diverse movie taste. You both enjoy drama and indie films."
  }
]
```

## Key Features

✅ **Community-Aware**: Analyzes patterns across all users, not just direct matches
✅ **Intelligent Scoring**: Gemini assigns compatibility scores based on multiple factors
✅ **Scalable**: Handles growing community data efficiently
✅ **Fallback Support**: Gracefully handles Gemini API errors
✅ **Pagination**: Shows 10 recommendations by default with "Show All" button
✅ **Explanations**: Users see why each person is recommended

## Error Handling

If the Gemini API is unavailable or misconfigured:
- Error message displays: "Could not load recommendations. Please check your Gemini API key."
- Users can still browse other sections of the app
- Graceful degradation with no app crashes

## Performance Considerations

- **Data Collection**: O(n) where n = total community members (runs once per page load)
- **Gemini API Call**: ~1-2 seconds typically
- **Profile Fetching**: Fetches only top 10 recommended profiles
- **Caching**: Recommendations refresh when user navigates to Profile tab

## Future Enhancements

- **Caching**: Store recommendations for 24 hours to reduce API calls
- **Rating System**: Incorporate explicit movie ratings for better matching
- **Weighted Genres**: Consider movie genres in AI analysis
- **Feedback Loop**: Learn from accepted/rejected recommendations
- **Real-time Updates**: Regenerate recommendations when friend lists change

## Troubleshooting

### "Could not load recommendations" error
- **Check**: Is your Gemini API key valid?
- **Check**: Is `.env.local` properly configured?
- **Check**: Is your Gemini API quota exceeded?
- **Check**: Browser console for detailed error messages

### Recommendations seem irrelevant
- **Check**: Do community members have diverse movie preferences?
- **Check**: Does your profile have enough watched movies (10+)?
- **Check**: Are there enough potential friends (not already connected)?

### Slow recommendations
- Large community sizes may take 2-3 seconds
- This is normal and expected with ~100+ users
- Gemini API latency varies by region

## File Structure
```
services/
  └── aiRecommendationService.ts    # AI recommendation logic
components/
  └── FriendRecommendations.tsx     # UI component
.env.local                           # API key configuration
```
