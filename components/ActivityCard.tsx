import React from 'react';
import { UserActivity } from '../types';
import { StarIcon } from './icons';
import { Avatar, Badge } from './ui';
import { POSTER_FALLBACK, handleImageError } from '../utils/images';

interface ActivityCardProps {
  activity: UserActivity;
  onSelectMovie: (movieId: number) => void;
  onSelectProfile: (userId: string) => void;
}

const actionLabels: Record<UserActivity['action'], string> = {
  watched: 'finished watching',
  'added to watchlist': 'added to their watchlist',
  reviewed: 'reviewed',
};

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, onSelectMovie, onSelectProfile }) => (
  <div className="card-surface flex items-start gap-4 p-4">
    <button
      onClick={() => onSelectProfile(activity.userId)}
      className="flex-shrink-0 transition-transform hover:scale-110"
      aria-label={`View profile of ${activity.userName}`}
    >
      <Avatar src={activity.userAvatarUrl} name={activity.userName} size="h-12 w-12" />
    </button>

    <div className="min-w-0 flex-1">
      <p className="text-sm">
        <button
          onClick={() => onSelectProfile(activity.userId)}
          className="font-bold text-surface-900 hover:underline dark:text-white"
        >
          {activity.userName}
        </button>
        <span className="text-surface-600 dark:text-surface-300"> {actionLabels[activity.action]}</span>
      </p>
      <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">{activity.timestamp}</p>

      {activity.action === 'reviewed' && activity.rating != null && (
        <div className="mt-2">
          <Badge tone="amber">
            <StarIcon className="h-3.5 w-3.5" /> {activity.rating}/10
          </Badge>
        </div>
      )}

      {activity.action === 'reviewed' && activity.reviewText && (
        <p className="mt-2 line-clamp-2 text-sm italic text-surface-600 dark:text-surface-400">
          “{activity.reviewText}”
        </p>
      )}

      <button
        onClick={() => onSelectMovie(activity.movie.id)}
        className="mt-3 flex w-full items-center gap-3 rounded-xl bg-surface-100 p-2 text-left transition-colors hover:bg-surface-200 dark:bg-surface-800/60 dark:hover:bg-surface-800"
        aria-label={`View details for ${activity.movie.title}`}
      >
        <img
          src={activity.movie.posterUrl}
          alt={activity.movie.title}
          onError={handleImageError(POSTER_FALLBACK)}
          className="h-14 w-10 flex-shrink-0 rounded-lg object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-surface-900 dark:text-white">
            {activity.movie.title}
          </p>
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Rating: {activity.movie.rating.toFixed(1)}
          </p>
        </div>
      </button>
    </div>
  </div>
);

export default ActivityCard;
