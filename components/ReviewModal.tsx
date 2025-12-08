import React, { useState, useEffect } from 'react';
import { Movie, MovieReview } from '../types';
import { StarIcon, XIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';

interface ReviewModalProps {
  movie: Movie;
  existingReview?: MovieReview | null;
  onClose: () => void;
  onSubmit: (rating: number, reviewText: string) => Promise<void>;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ movie, existingReview, onClose, onSubmit }) => {
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(existingReview?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>(existingReview?.review_text || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to submit a review');
      return;
    }

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit(rating, reviewText.trim());
      onClose();
    } catch (err) {
      console.error('Error submitting review:', err);
      setError('Failed to submit review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-start justify-between">
          <div className="flex-1 pr-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {existingReview ? 'Edit Your Review' : 'Write a Review'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{movie.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Close modal"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Movie Info */}
          <div className="flex items-start gap-4 mb-6">
            <img 
              src={movie.posterUrl} 
              alt={movie.title}
              className="w-20 h-30 rounded-lg object-cover shadow-md"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">{movie.title}</h3>
              <div className="flex items-center mt-1 text-sm text-gray-600 dark:text-gray-400">
                <StarIcon className="w-4 h-4 text-yellow-400 mr-1" />
                <span>TMDB: {movie.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Rating Section */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Your Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  aria-label={`Rate ${star} out of 10`}
                >
                  <StarIcon 
                    className={`w-8 h-8 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-lg font-bold text-gray-900 dark:text-white">
                  {rating}/10
                </span>
              )}
            </div>
          </div>

          {/* Review Text Section */}
          <div className="mb-6">
            <label 
              htmlFor="reviewText" 
              className="block text-sm font-semibold text-gray-900 dark:text-white mb-2"
            >
              Your Review (Optional)
            </label>
            <textarea
              id="reviewText"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your thoughts about this movie..."
              rows={6}
              maxLength={2000}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       placeholder-gray-400 dark:placeholder-gray-500
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       resize-none transition-colors"
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Write what you loved or didn't love about the movie
              </p>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {reviewText.length}/2000
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 
                       hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-semibold 
                       transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || rating === 0}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold 
                       transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                       disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <span>{existingReview ? 'Update Review' : 'Submit Review'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
