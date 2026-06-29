import React, { useState } from 'react';
import { Movie, MovieReview } from '../types';
import { StarIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';
import { Button, Modal, Textarea } from './ui';
import { POSTER_FALLBACK, handleImageError } from '../utils/images';

interface ReviewModalProps {
  movie: Movie;
  existingReview?: MovieReview | null;
  onClose: () => void;
  onSubmit: (rating: number, reviewText: string) => Promise<void>;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ movie, existingReview, onClose, onSubmit }) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState(existingReview?.review_text || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return setError('You must be logged in to submit a review');
    if (rating === 0) return setError('Please select a rating');

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

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={existingReview ? 'Edit your review' : 'Write a review'}
      subtitle={movie.title}
    >
      <form onSubmit={handleSubmit} className="p-6">
        <div className="mb-6 flex items-start gap-4">
          <img
            src={movie.posterUrl}
            alt={movie.title}
            onError={handleImageError(POSTER_FALLBACK)}
            className="h-28 w-20 rounded-xl object-cover shadow-md"
          />
          <div>
            <h3 className="font-semibold text-surface-900 dark:text-white">{movie.title}</h3>
            <div className="mt-1 flex items-center gap-1 text-sm text-surface-500 dark:text-surface-400">
              <StarIcon className="h-4 w-4 text-amber-400" /> TMDB: {movie.rating.toFixed(1)}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-3 block text-sm font-semibold text-surface-900 dark:text-white">
            Your rating <span className="text-brand-500">*</span>
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="rounded transition-transform hover:scale-110"
                aria-label={`Rate ${star} out of 10`}
              >
                <StarIcon
                  className={cn(
                    'h-7 w-7 transition-colors',
                    star <= (hoveredRating || rating)
                      ? 'text-amber-400'
                      : 'text-surface-300 dark:text-surface-600'
                  )}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-2 text-lg font-bold text-surface-900 dark:text-white">{rating}/10</span>
            )}
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="reviewText" className="mb-2 block text-sm font-semibold text-surface-900 dark:text-white">
            Your review (optional)
          </label>
          <Textarea
            id="reviewText"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your thoughts about this movie…"
            rows={6}
            maxLength={2000}
          />
          <div className="mt-2 flex items-center justify-between text-xs text-surface-500 dark:text-surface-400">
            <span>Write what you loved or didn't love about the movie</span>
            <span>{reviewText.length}/2000</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-brand-500/15 p-3 text-sm text-brand-600 dark:text-brand-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading} disabled={rating === 0}>
            {existingReview ? 'Update review' : 'Submit review'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ReviewModal;
