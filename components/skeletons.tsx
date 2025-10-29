import React from 'react';

export const MovieListSkeleton: React.FC = () => (
    <section className="mb-12 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700/50 rounded w-1/3 mb-4 ml-4 md:ml-0"></div>
        <div className="flex space-x-4 overflow-x-hidden pb-4 pl-4 md:pl-0">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="w-40 md:w-48 flex-shrink-0">
                    <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700/50 rounded-lg"></div>
                </div>
            ))}
        </div>
    </section>
);

export const FriendListSkeleton: React.FC = () => (
    <div className="space-y-2 animate-pulse">
        {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md">
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                <div className="h-6 w-6 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
            </div>
        ))}
    </div>
);
