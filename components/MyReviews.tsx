import React, { useState, useEffect } from 'react';
import { MovieReview } from '../types';
import { getUserReviews } from '../supabaseApi';
import { fetchMovieDetails } from '../api';
import { StarIcon } from './icons';
import { Badge, Card } from './ui';
import { POSTER_FALLBACK, handleImageError } from '../utils/images';

interface MyReviewsProps {
  userId: string;
  onSelectMovie: (movieId: number) => void;
}

interface ReviewWithMovie extends MovieReview {
  movieTitle?: string;
  moviePoster?: string;
  movieRating?: number;
}

const MyReviews: React.FC<MyReviewsProps> = ({ userId, onSelectMovie }) => {
  const [reviews, setReviews] = useState<ReviewWithMovie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      try {
        const userReviews = await getUserReviews(userId);
        const withMovies = await Promise.all(
          userReviews.map(async (review) => {
            try {
              const movie = await fetchMovieDetails(review.tmdb_movie_id);
              return {
                ...review,
                movieTitle: movie?.title,
                moviePoster: movie?.posterUrl,
                movieRating: movie?.rating,
              };
            } catch (error) {
              console.error('Failed to fetch movie details for review:', error);
              return review;
            }
          })
        );
        setReviews(withMovies);
      } catch (error) {
        console.error('Failed to fetch user reviews:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [userId]);

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="mb-4 text-2xl font-bold text-surface-900 dark:text-white">My Reviews</h2>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="mb-4 text-2xl font-bold text-surface-900 dark:text-white">My Reviews</h2>
        <Card className="py-8 text-center">
          <p className="text-surface-500 dark:text-surface-400">You haven't reviewed any movies yet.</p>
          <p className="mt-2 text-sm text-surface-400 dark:text-surface-500">
            Open a movie and tap “Write Review” to share your thoughts.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="mb-4 text-2xl font-bold text-surface-900 dark:text-white">
        My Reviews ({reviews.length})
      </h2>
      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id} className="transition-shadow hover:shadow-lg">
            <div className="flex gap-4">
              <button onClick={() => onSelectMovie(review.tmdb_movie_id)} className="flex-shrink-0">
                <img
                  src={review.moviePoster || POSTER_FALLBACK}
                  alt={review.movieTitle || 'Movie'}
                  onError={handleImageError(POSTER_FALLBACK)}
                  className="h-28 w-20 rounded-xl object-cover transition-opacity hover:opacity-80"
                />
              </button>

              <div className="min-w-0 flex-1">
                <button onClick={() => onSelectMovie(review.tmdb_movie_id)} className="group text-left">
                  <h3 className="truncate text-lg font-bold text-surface-900 transition-colors group-hover:text-brand-500 dark:text-white">
                    {review.movieTitle || `Movie #${review.tmdb_movie_id}`}
                  </h3>
                </button>

                <div className="mt-2 flex items-center gap-2">
                  <Badge tone="amber">
                    <StarIcon className="h-4 w-4" /> {review.rating}/10
                  </Badge>
                  {review.movieRating != null && (
                    <span className="text-sm text-surface-500 dark:text-surface-400">
                      TMDB: {review.movieRating.toFixed(1)}
                    </span>
                  )}
                </div>

                {review.review_text && (
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-surface-700 dark:text-surface-300">
                    {review.review_text}
                  </p>
                )}

                <p className="mt-2 text-xs text-surface-500 dark:text-surface-400">
                  Reviewed{' '}
                  {new Date(review.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MyReviews;
