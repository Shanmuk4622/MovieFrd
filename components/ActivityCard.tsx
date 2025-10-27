
import React from 'react';
import { UserActivity } from '../types';

interface ActivityCardProps {
  activity: UserActivity;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity }) => {
  const actionText = activity.action === 'watched' ? 'finished watching' : 'added to their watchlist';

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex items-start space-x-4 shadow-md">
      <img src={activity.userAvatarUrl} alt={activity.userName} className="w-12 h-12 rounded-full object-cover" />
      <div className="flex-1">
        <p className="text-sm text-gray-300">
          <span className="font-bold text-white">{activity.userName}</span>
          {' '}{actionText}
        </p>
        <p className="text-xs text-gray-400 mt-1">{activity.timestamp}</p>
        <div className="mt-3 bg-gray-700/50 rounded flex items-center p-2">
            <img src={activity.movie.posterUrl} alt={activity.movie.title} className="w-10 h-14 rounded object-cover"/>
            <div className="ml-3">
                <p className="font-semibold text-white text-sm">{activity.movie.title}</p>
                 <p className="text-xs text-gray-400">Rating: {activity.movie.rating.toFixed(1)}</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityCard;
