

import React from 'react';
import { Movie, UserActivity } from '../types';

interface ActivityCardProps {
  activity: UserActivity;
  onSelectMovie: (movieId: number) => void;
  onSelectProfile: (userId: string) => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, onSelectMovie, onSelectProfile }) => {
  const actionText = activity.action === 'watched' ? 'finished watching' : 'added to their watchlist';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-start space-x-4 shadow-md">
      {/* User Info Section */}
      <div className="flex-shrink-0">
        <button
          onClick={() => onSelectProfile(activity.userId)}
          className="block group"
          aria-label={`View profile of ${activity.userName}`}
        >
          <img 
            src={activity.userAvatarUrl} 
            alt={activity.userName} 
            className="w-12 h-12 rounded-full object-cover transition-transform transform group-hover:scale-110" 
          />
        </button>
      </div>

      <div className="flex-1">
        {/* Activity Text Section */}
        <div className="text-sm">
          <button
            onClick={() => onSelectProfile(activity.userId)}
            className="font-bold text-gray-900 dark:text-white hover:underline"
          >
            {activity.userName}
          </button>
          <span className="text-gray-700 dark:text-gray-300">
            {' '}{actionText}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.timestamp}</p>
        
        {/* Movie Section */}
        <button
          onClick={() => onSelectMovie(activity.movie.id)}
          className="mt-3 bg-gray-100 dark:bg-gray-700/50 rounded flex items-center p-2 w-full text-left hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label={`View details for ${activity.movie.title}`}
        >
          <img src={activity.movie.posterUrl} alt={activity.movie.title} className="w-10 h-14 rounded object-cover flex-shrink-0"/>
          <div className="ml-3 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{activity.movie.title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Rating: {activity.movie.rating.toFixed(1)}</p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default ActivityCard;