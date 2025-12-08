# Movie Review & Rating System

## Overview
The movie review and rating system allows users to rate movies (1-10 scale) and write detailed reviews. Reviews are shared with friends through the activity feed, creating a social experience around movie opinions.

## Features

### ✨ Core Functionality
- **10-Point Rating Scale**: Rate movies from 1 to 10 stars
- **Review Text**: Write detailed reviews up to 2000 characters
- **Edit Reviews**: Update your rating or review text anytime
- **Quick Access**: Review button directly on movie cards
- **Social Feed**: Reviews appear in friends' activity feeds
- **Visual Feedback**: Star rating UI with hover effects

### 🎯 User Experience
- **Modal Interface**: Clean, focused review modal
- **Rating Display**: See your existing rating on movie cards
- **Review Preview**: Friends see rating + text snippet in feed
- **Instant Updates**: Real-time submission and updates
- **Error Handling**: Clear error messages and loading states

## Database Schema

### Table: `movie_reviews`
```sql
CREATE TABLE movie_reviews (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tmdb_movie_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
    review_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tmdb_movie_id) -- One review per user per movie
);
```

**Indexes:**
- `idx_movie_reviews_user_id` - Fast user review lookups
- `idx_movie_reviews_tmdb_movie_id` - Fast movie review queries
- `idx_movie_reviews_created_at` - Sorted activity feed queries

**RLS Policies:**
- Anyone can read all reviews
- Users can insert/update/delete their own reviews
- Auth enforced via `auth.uid()` checks

## Setup Instructions

### 1. Run Database Migration
Execute the SQL schema in your Supabase dashboard:
```bash
# Navigate to Supabase SQL Editor
# Run the contents of: supabase/reviews-schema.sql
```

### 2. Verify Tables
Check that the following were created:
- ✅ `movie_reviews` table
- ✅ Indexes on user_id, tmdb_movie_id, created_at
- ✅ RLS policies enabled
- ✅ `update_movie_review_updated_at()` function
- ✅ Update trigger on table

### 3. Test Review Flow
1. Navigate to any movie card
2. Hover over the card
3. Click "Write Review" button
4. Select a rating (1-10 stars)
5. Optionally write review text
6. Click "Submit Review"
7. Verify your rating appears on the card
8. Check that friends see it in their activity feed

## Component Architecture

### ReviewModal Component
**Location:** `components/ReviewModal.tsx`

**Props:**
- `movie: Movie` - Movie being reviewed
- `existingReview?: MovieReview | null` - User's existing review (for edits)
- `onClose: () => void` - Close modal callback
- `onSubmit: (rating: number, reviewText: string) => Promise<void>` - Submit handler

**Features:**
- Interactive 10-star rating selector
- Hover effects on stars
- Character counter (2000 max)
- Loading states during submission
- Error message display
- Backdrop click to close
- Escape key support

**State Management:**
```typescript
const [rating, setRating] = useState<number>(existingReview?.rating || 0);
const [hoveredRating, setHoveredRating] = useState<number>(0);
const [reviewText, setReviewText] = useState<string>(existingReview?.review_text || '');
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

### MovieCard Updates
**Location:** `components/MovieCard.tsx`

**New State:**
```typescript
const [showReviewModal, setShowReviewModal] = useState(false);
const [userReview, setUserReview] = useState<MovieReview | null>(null);
```

**Review Button:**
- Purple background for visual distinction
- Shows "Your Rating: X/10" if reviewed
- Shows "Write Review" if not reviewed
- Loads existing review on hover
- Opens modal on click

**Review Submission:**
```typescript
const handleReviewSubmit = async (rating: number, reviewText: string) => {
  if (!user) return;
  
  const review = await addOrUpdateReview(user.id, movie.id, rating, reviewText);
  setUserReview(review);
  onListUpdate(`Review for '${movie.title}' ${userReview ? 'updated' : 'submitted'} successfully!`);
};
```

### ActivityCard Enhancements
**Location:** `components/ActivityCard.tsx`

**Review Display:**
1. **Action Text**: Shows "reviewed" instead of "watched" or "added to watchlist"
2. **Rating Badge**: Yellow star icon + rating (e.g., "8/10")
3. **Review Preview**: First 2 lines of review text with "..." truncation

**Visual Design:**
```tsx
{activity.action === 'reviewed' && activity.rating && (
  <div className="flex items-center bg-yellow-400/20 px-2 py-1 rounded">
    <StarIcon className="w-4 h-4 text-yellow-400 fill-yellow-400" />
    <span className="font-bold text-yellow-600">{activity.rating}/10</span>
  </div>
)}

{activity.reviewText && (
  <p className="text-sm text-gray-600 italic line-clamp-2">
    "{activity.reviewText}"
  </p>
)}
```

### Dashboard Integration
**Location:** `components/Dashboard.tsx`

**Activity Feed Updates:**
- Fetches both movie list activities AND review activities
- Combines and sorts by `created_at` timestamp
- Maps review data to UserActivity format with rating/reviewText
- Displays in unified activity feed

**Activity Type Detection:**
```typescript
const isReview = 'rating' in activity;

action: isReview 
  ? 'reviewed' 
  : activity.list_type === 'watched' 
    ? 'watched' 
    : 'added to watchlist'
```

## API Functions

### Core Review Operations

#### `addOrUpdateReview()`
Creates or updates a review (upsert pattern)
```typescript
await addOrUpdateReview(userId, movieId, rating, reviewText);
// Returns: MovieReview
```

#### `getUserReview()`
Fetches user's review for a specific movie
```typescript
const review = await getUserReview(userId, movieId);
// Returns: MovieReview | null
```

#### `getMovieReviews()`
Fetches all reviews for a movie (with user profiles)
```typescript
const reviews = await getMovieReviews(movieId, limit);
// Returns: MovieReview[] with profiles joined
```

#### `deleteReview()`
Removes a user's review
```typescript
await deleteReview(userId, movieId);
```

#### `getUserReviews()`
Fetches all reviews by a user
```typescript
const reviews = await getUserReviews(userId);
// Returns: MovieReview[]
```

### Activity Feed Integration

#### `getFriendActivity()` - Updated
Now fetches BOTH list activities and review activities:
```typescript
// Fetch watched/watchlist activities
const listActivities = await supabase
  .from('user_movie_lists')
  .select('*, profiles(*)')
  .in('user_id', friendIds);

// Fetch review activities  
const reviewActivities = await supabase
  .from('movie_reviews')
  .select('*, profiles(*)')
  .in('user_id', friendIds);

// Combine and sort by created_at
const allActivities = [
  ...listActivities,
  ...reviewActivities
].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
```

**Return Type:**
```typescript
type FriendActivity = UserMovieList & { created_at: string; profiles: Profile };
type FriendReviewActivity = MovieReview & { profiles: Profile };

getFriendActivity(): Promise<(FriendActivity | FriendReviewActivity)[]>
```

## Type Definitions

### MovieReview Interface
```typescript
export interface MovieReview {
  id: number;
  user_id: string;
  tmdb_movie_id: number;
  rating: number; // 1-10
  review_text: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}
```

### UserActivity Interface (Updated)
```typescript
export interface UserActivity {
  id: number;
  userId: string;
  userName: string;
  userAvatarUrl: string;
  action: 'watched' | 'added to watchlist' | 'reviewed'; // Added 'reviewed'
  movie: Movie;
  timestamp: string;
  rating?: number; // For review activities
  reviewText?: string; // For review activities
}
```

## User Flow

### Writing a Review
1. User browses dashboard/search results
2. Hovers over movie card → overlay appears
3. Clicks "Write Review" button → modal opens
4. Clicks stars to select rating (1-10)
5. Optionally writes review text
6. Clicks "Submit Review"
7. Modal closes, card updates to show rating
8. Toast notification confirms submission
9. Review appears in friends' activity feeds

### Editing a Review
1. User hovers over previously reviewed movie
2. Card shows "Your Rating: X/10"
3. Clicks review button → modal opens with existing data
4. Modifies rating and/or review text
5. Clicks "Update Review"
6. Changes saved, activity feed updates

### Viewing Friend Reviews
1. User navigates to Dashboard
2. Friend Activity section shows recent actions
3. Review activities display:
   - Friend's name + "reviewed"
   - Rating badge (e.g., "8/10" with star icon)
   - First 2 lines of review text
   - Movie poster and title
4. Click movie → view full details
5. Click profile → view friend's profile

## Validation & Error Handling

### Frontend Validation
- **Rating Required**: Cannot submit without selecting 1-10 stars
- **Character Limit**: Review text capped at 2000 characters
- **Loading States**: Button disabled during submission
- **Error Display**: Red alert box shows error messages

### Backend Validation
- **Rating Range**: Database constraint `CHECK (rating >= 1 AND rating <= 10)`
- **Unique Constraint**: One review per user per movie
- **RLS Policies**: Users can only edit their own reviews
- **Upsert Logic**: Update if exists, insert if new

### Error Messages
```typescript
// Not logged in
"You must be logged in to submit a review"

// No rating selected
"Please select a rating"

// Network/DB error
"Failed to submit review. Please try again."
```

## Performance Considerations

### Optimizations
- **Lazy Loading**: Reviews loaded on hover, not on mount
- **Query Limits**: Activity feed limited to 20 most recent
- **Combined Queries**: Single query for list + review activities
- **Indexed Queries**: Database indexes on common lookups
- **Debounced Actions**: Prevent double submissions

### Caching Strategy
- User's own review cached in MovieCard state
- Activity feed refreshed on user change
- Movie details cached in Dashboard

## Future Enhancements

### Potential Features
- [ ] **Like Reviews**: Users can upvote helpful reviews
- [ ] **Review Replies**: Comment threads on reviews
- [ ] **Spoiler Tags**: Mark reviews with spoilers
- [ ] **Review Statistics**: Average friend rating per movie
- [ ] **Review Filters**: Filter activity by rating (e.g., 8+ only)
- [ ] **Review Notifications**: Notify when friend reviews watched movie
- [ ] **Review Search**: Search reviews by keyword
- [ ] **Review Exports**: Export personal review history
- [ ] **Review Insights**: Most reviewed genres, rating trends
- [ ] **Verified Reviews**: Badge for users who've watched movie

### Technical Improvements
- [ ] Real-time review updates via Supabase subscriptions
- [ ] Review text formatting (bold, italics)
- [ ] Image attachments in reviews
- [ ] Video review integration
- [ ] Review analytics dashboard
- [ ] Review moderation tools
- [ ] Sentiment analysis on reviews

## Testing Checklist

### Manual Testing
- [ ] Submit new review with rating + text
- [ ] Submit review with rating only (no text)
- [ ] Edit existing review (change rating)
- [ ] Edit existing review (change text)
- [ ] Cancel review modal without saving
- [ ] Submit review with 2000 character text
- [ ] Try to submit without rating (should fail)
- [ ] Verify review appears on movie card
- [ ] Verify review appears in friend's activity feed
- [ ] Verify rating badge displays correctly
- [ ] Verify review text preview truncates properly
- [ ] Click movie from review activity → opens movie detail
- [ ] Logout → login → verify reviews persist
- [ ] Multiple users review same movie → all visible

### Database Testing
```sql
-- Check review was created
SELECT * FROM movie_reviews WHERE user_id = '<user_id>' AND tmdb_movie_id = <movie_id>;

-- Check unique constraint works
INSERT INTO movie_reviews (user_id, tmdb_movie_id, rating) 
VALUES ('<same_user>', <same_movie>, 5); -- Should fail

-- Check rating constraint works
INSERT INTO movie_reviews (user_id, tmdb_movie_id, rating) 
VALUES ('<user_id>', <movie_id>, 11); -- Should fail (rating > 10)

-- Check activity feed includes reviews
SELECT * FROM movie_reviews 
WHERE user_id IN (SELECT addressee_id FROM friendships WHERE requester_id = '<user_id>' AND status = 'accepted')
ORDER BY created_at DESC;
```

### Edge Cases
- [ ] Review very long movie title (truncation)
- [ ] Review movie with no poster (placeholder image)
- [ ] Submit review with special characters in text
- [ ] Rapid click submit button (should debounce)
- [ ] Network interruption during submit
- [ ] Delete movie from watchlist after reviewing (review persists)
- [ ] User unfriends → review no longer appears in feed
- [ ] Concurrent edits from different devices

## Troubleshooting

### Common Issues

**Issue: "Review button not appearing on movie cards"**
- Check that ReviewModal is imported in MovieCard.tsx
- Verify user is logged in
- Check browser console for errors

**Issue: "Review not appearing in activity feed"**
- Verify users are friends (status = 'accepted')
- Check that getFriendActivity includes movie_reviews query
- Verify created_at timestamp is recent

**Issue: "Cannot submit review"**
- Check Supabase connection
- Verify movie_reviews table exists
- Check RLS policies are enabled
- Verify rating is between 1-10

**Issue: "Star ratings not clickable"**
- Check z-index conflicts in CSS
- Verify button type="button" (not "submit")
- Check for overlapping elements

**Issue: "Review text not saving"**
- Verify column name is `review_text` (not `text` or `content`)
- Check 2000 character limit not exceeded
- Verify database column type is TEXT

### Debug Commands

```typescript
// Check if user review exists
const review = await getUserReview(user.id, movieId);
console.log('Existing review:', review);

// Check friend activity includes reviews
const activities = await getFriendActivity(user.id);
const reviewActivities = activities.filter(a => 'rating' in a);
console.log('Review activities:', reviewActivities);

// Check database directly
const { data, error } = await supabase
  .from('movie_reviews')
  .select('*')
  .eq('user_id', user.id);
console.log('All user reviews:', data);
```

## Performance Metrics

### Expected Performance
- **Review Submission**: < 500ms
- **Modal Open**: Instant (cached review if exists)
- **Activity Feed Load**: < 1s (20 activities + movie details)
- **Review Preview Render**: < 100ms

### Monitoring
```typescript
// Add performance timing
console.time('Review Submission');
await addOrUpdateReview(userId, movieId, rating, reviewText);
console.timeEnd('Review Submission'); // Should be < 500ms
```

## Security Considerations

### RLS Enforcement
- Users can only edit/delete their own reviews
- All reads are public (by design)
- Insert/Update/Delete protected by auth.uid()

### Input Sanitization
- Review text stored as-is (display handled by React)
- XSS prevented by React's auto-escaping
- SQL injection prevented by Supabase client

### Rate Limiting
Consider implementing:
- Max reviews per minute per user
- Max review text edits per day
- Spam detection for identical reviews

## Credits
Built with:
- React 19 + TypeScript
- Supabase (PostgreSQL + Realtime)
- Tailwind CSS
- TMDB API

---

**Version:** 1.0.0  
**Last Updated:** December 8, 2025  
**Author:** MovieFrd Development Team
