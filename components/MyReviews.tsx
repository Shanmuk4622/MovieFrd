import React, { useState, useEffect } from 'react';
import { MovieReview } from '../types';
import { getUserReviews } from '../supabaseApi';
import { fetchMovieDetails } from '../api';
import { StarIcon } from './icons';

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
        
        // Fetch movie details for each review
        const reviewsWithMovies = await Promise.all(
          userReviews.map(async (review) => {
            try {
              const movie = await fetchMovieDetails(review.tmdb_movie_id);
              return {
                ...review,
                movieTitle: movie?.title,
                moviePoster: movie?.posterUrl,
                movieRating: movie?.rating
              };
            } catch (error) {
              console.error('Failed to fetch movie details for review:', error);
              return review;
            }
          })
        );
        
        setReviews(reviewsWithMovies);
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
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">My Reviews</h2>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">My Reviews</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">You haven't reviewed any movies yet.</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Start by hovering over a movie and clicking "Write Review"
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        My Reviews ({reviews.length})
      </h2>
      <div className="space-y-4">
        {reviews.map((review) => (
          <div 
            key={review.id}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="flex gap-4">
              {/* Movie Poster */}
              <button
                onClick={() => onSelectMovie(review.tmdb_movie_id)}
                className="flex-shrink-0"
              >
                <img
                  src={review.moviePoster || 'https://via.placeholder.com/80x120.png?text=No+Image'}
                  alt={review.movieTitle || 'Movie'}
                  className="w-20 h-28 rounded object-cover hover:opacity-80 transition-opacity"
                />
              </button>

              {/* Review Content */}
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => onSelectMovie(review.tmdb_movie_id)}
                  className="text-left group"
                >
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    {review.movieTitle || `Movie #${review.tmdb_movie_id}`}
                  </h3>
                </button>

                {/* Rating Display */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center bg-yellow-400/20 dark:bg-yellow-400/30 px-3 py-1 rounded">
                    <StarIcon className="w-5 h-5 text-yellow-400 fill-yellow-400 mr-1" />
                    <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                      {review.rating}/10
                    </span>
                  </div>
                  {review.movieRating && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      TMDB: {review.movieRating.toFixed(1)}
                    </span>
                  )}
                </div>

                {/* Review Text */}
                {review.review_text && (
                  <p className="mt-3 text-gray-700 dark:text-gray-300 text-sm leading-relaxed line-clamp-3">
                    {review.review_text}
                  </p>
                )}

                {/* Date */}
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Reviewed {new Date(review.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyReviews;
