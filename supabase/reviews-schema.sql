-- Movie Reviews Table
-- This table stores user reviews and ratings for movies
CREATE TABLE IF NOT EXISTS movie_reviews (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tmdb_movie_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
    review_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tmdb_movie_id) -- One review per user per movie
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_movie_reviews_user_id ON movie_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_movie_reviews_tmdb_movie_id ON movie_reviews(tmdb_movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_reviews_created_at ON movie_reviews(created_at DESC);

-- Enable Row Level Security
ALTER TABLE movie_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow users to read all reviews
CREATE POLICY "Anyone can read reviews"
    ON movie_reviews FOR SELECT
    USING (true);

-- Allow users to insert their own reviews
CREATE POLICY "Users can insert their own reviews"
    ON movie_reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own reviews
CREATE POLICY "Users can update their own reviews"
    ON movie_reviews FOR UPDATE
    USING (auth.uid() = user_id);

-- Allow users to delete their own reviews
CREATE POLICY "Users can delete their own reviews"
    ON movie_reviews FOR DELETE
    USING (auth.uid() = user_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_movie_review_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_movie_reviews_updated_at
    BEFORE UPDATE ON movie_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_movie_review_updated_at();

-- Function to get movie reviews with user profiles
CREATE OR REPLACE FUNCTION get_movie_reviews(movie_id INTEGER, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id BIGINT,
    user_id UUID,
    tmdb_movie_id INTEGER,
    rating INTEGER,
    review_text TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    username TEXT,
    avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mr.id,
        mr.user_id,
        mr.tmdb_movie_id,
        mr.rating,
        mr.review_text,
        mr.created_at,
        mr.updated_at,
        p.username,
        p.avatar_url
    FROM movie_reviews mr
    JOIN profiles p ON mr.user_id = p.id
    WHERE mr.tmdb_movie_id = movie_id
    ORDER BY mr.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
