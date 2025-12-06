import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../supabaseClient';
import { Profile, UserMovieList } from '../types';

/**
 * AI-Powered Recommendation Service using Google Gemini
 * Analyzes community data (watched movies, watchlists, friend connections, user preferences)
 * and generates intelligent friend recommendations based on shared interests and viewing patterns.
 */

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

/**
 * Validates that Gemini API key is configured
 */
const isGeminiConfigured = (): boolean => {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key_here') {
    console.warn('[AI Recommendations] Gemini API key not configured. Set VITE_GEMINI_API_KEY in .env.local');
    return false;
  }
  return true;
};

interface CommunityUser {
  id: string;
  username: string;
  watched_movies: number[];
  watchlist_movies: number[];
  friend_count: number;
}

interface RecommendationInput {
  currentUser: Profile;
  currentUserMovies: UserMovieList[];
  communityData: CommunityUser[];
  potentialFriends: Profile[];
}

interface GeminiRecommendation {
  userId: string;
  username: string;
  reason: string;
  compatibility_score: number;
}

/**
 * Collects community data for AI analysis
 */
const collectCommunityData = async (currentUserId: string): Promise<CommunityUser[]> => {
  try {
    // Fetch all users except current user
    const { data: allUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, username')
      .not('id', 'eq', currentUserId);

    if (usersError) throw usersError;
    if (!allUsers || allUsers.length === 0) return [];

    // Collect movie preferences for each user
    const communityData: CommunityUser[] = await Promise.all(
      allUsers.map(async (user) => {
        // Get user's watched movies
        const { data: watchedData } = await supabase
          .from('user_movie_lists')
          .select('tmdb_movie_id')
          .eq('user_id', user.id)
          .eq('list_type', 'watched');

        // Get user's watchlist
        const { data: watchlistData } = await supabase
          .from('user_movie_lists')
          .select('tmdb_movie_id')
          .eq('user_id', user.id)
          .eq('list_type', 'watchlist');

        // Get user's friend count
        const { data: friendsData } = await supabase
          .from('friendships')
          .select('id', { count: 'exact', head: true })
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          .eq('status', 'accepted');

        return {
          id: user.id,
          username: user.username,
          watched_movies: (watchedData || []).map(d => d.tmdb_movie_id),
          watchlist_movies: (watchlistData || []).map(d => d.tmdb_movie_id),
          friend_count: friendsData?.length || 0,
        };
      })
    );

    return communityData;
  } catch (error) {
    console.error('Error collecting community data:', error);
    return [];
  }
};

/**
 * Generates AI-powered friend recommendations using Gemini
 */
export const generateAIPoweredRecommendations = async (
  currentUser: Profile,
  currentUserMovies: UserMovieList[],
  existingFriendIds: string[]
): Promise<Profile[]> => {
  try {
    // Check if Gemini is configured
    if (!isGeminiConfigured()) {
      console.warn('[AI Recommendations] Using fallback recommendations (no API key)');
      return [];
    }

    // Collect community data
    const communityData = await collectCommunityData(currentUser.id);

    if (communityData.length === 0) {
      console.warn('No community data available for recommendations');
      return [];
    }

    // Prepare current user's movie data
    const currentUserWatched = currentUserMovies
      .filter(m => m.list_type === 'watched')
      .map(m => m.tmdb_movie_id);
    
    const currentUserWatchlist = currentUserMovies
      .filter(m => m.list_type === 'watchlist')
      .map(m => m.tmdb_movie_id);

    // Filter out already-friended users and the current user
    const potentialFriends = communityData.filter(
      u => u.id !== currentUser.id && !existingFriendIds.includes(u.id)
    );

    if (potentialFriends.length === 0) {
      console.log('No potential friends to recommend');
      return [];
    }

    // Create prompt for Gemini
    const prompt = createRecommendationPrompt(
      currentUser,
      currentUserWatched,
      currentUserWatchlist,
      potentialFriends,
      communityData
    );

    // Call Gemini API with error handling
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Parse Gemini response
      const recommendations = parseGeminiResponse(responseText, potentialFriends);

      // Fetch full profile data for top recommendations
      const topRecommendationIds = recommendations
        .slice(0, 10)
        .map(r => r.userId);

      if (topRecommendationIds.length === 0) {
        console.warn('No valid recommendations from Gemini');
        return [];
      }

      const { data: recommendedProfiles, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', topRecommendationIds);

      if (error) throw error;

      // Sort by recommendation order from Gemini
      const sortedProfiles = topRecommendationIds
        .map(id => recommendedProfiles?.find(p => p.id === id))
        .filter((p): p is Profile => p !== undefined);

      return sortedProfiles;
    } catch (apiError) {
      console.error('[AI Recommendations] Gemini API error:', apiError);
      // Return empty array to fallback gracefully
      return [];
    }
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    return [];
  }
};

/**
 * Creates a detailed prompt for Gemini with community data
 */
const createRecommendationPrompt = (
  currentUser: Profile,
  watched: number[],
  watchlist: number[],
  potentialFriends: CommunityUser[],
  allCommunityData: CommunityUser[]
): string => {
  return `You are a friend recommendation engine for a movie discovery platform. Analyze the following data and recommend the best potential friends for the user.

CURRENT USER: ${currentUser.username}
- Watched: ${watched.length} movies (IDs: ${watched.slice(0, 20).join(',')})
- Watchlist: ${watchlist.length} movies (IDs: ${watchlist.slice(0, 20).join(',')})

POTENTIAL FRIENDS (filtered - not yet connected):
${potentialFriends
  .map(
    f =>
      `- ${f.username}: watched ${f.watched_movies.length} movies (${f.watched_movies.slice(0, 10).join(',')}), watchlist ${f.watchlist_movies.length} (${f.watchlist_movies.slice(0, 10).join(',')}), has ${f.friend_count} friends`
  )
  .join('\n')}

COMMUNITY OVERVIEW:
- Total users: ${allCommunityData.length}
- Average watched: ${Math.round(allCommunityData.reduce((acc, u) => acc + u.watched_movies.length, 0) / allCommunityData.length)} movies
- Average friends per user: ${Math.round(allCommunityData.reduce((acc, u) => acc + u.friend_count, 0) / allCommunityData.length)}

RECOMMENDATION CRITERIA (in priority order):
1. Movie taste alignment: Users who have watched movies the current user has watched (shared interests)
2. Complementary interests: Users whose watchlist overlaps with current user's watched movies
3. Social reach: Users with moderate to high friend counts (more connected = better networking)
4. Community fit: Consider the overall community diversity and patterns

Generate recommendations as a JSON array. For each recommendation, include:
- userId: exact username from POTENTIAL FRIENDS list
- compatibility_score: 1-100 score based on shared movie interests
- reason: brief explanation of why they'd be a good friend (max 2 sentences)

Return ONLY valid JSON array. Example format:
[
  {"userId": "username1", "compatibility_score": 85, "reason": "Shares 5 watched movies and has complementary watchlist preferences"},
  {"userId": "username2", "compatibility_score": 72, "reason": "Active community member with diverse movie taste"}
]

Recommend the top 10 most compatible potential friends. Return ONLY the JSON array, no other text.`;
};

/**
 * Parses Gemini's JSON response and matches it to user profiles
 */
const parseGeminiResponse = (
  responseText: string,
  potentialFriends: CommunityUser[]
): GeminiRecommendation[] => {
  try {
    // Extract JSON from response (handle cases where model includes extra text)
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON found in Gemini response');
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      userId?: string;
      compatibility_score?: number;
      reason?: string;
    }>;

    // Map usernames back to actual user IDs
    return parsed
      .map(item => {
        const friend = potentialFriends.find(
          f => f.username === item.userId || f.username === item.userId?.toLowerCase()
        );
        if (!friend) return null;

        return {
          userId: friend.id,
          username: friend.username,
          reason: item.reason || 'Good match based on shared interests',
          compatibility_score: Math.min(100, Math.max(0, item.compatibility_score || 50)),
        };
      })
      .filter((r): r is GeminiRecommendation => r !== null);
  } catch (error) {
    console.error('Error parsing Gemini response:', error, 'Response:', responseText);
    return [];
  }
};
