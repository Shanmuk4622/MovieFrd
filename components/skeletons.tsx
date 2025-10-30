import React from 'react';

export const MovieListSkeleton: React.FC = () => (
    <section className="mb-12 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700/50 rounded w-1/3 mb-4 ml-4 md:ml-0"></div>
        <div className="flex space-x-4 overflow-x-hidden pb-4 pl-4 md:pl-0">
            {[...Array(7)].map((_, i) => (
                <div key={i} className="w-40 md:w-48 flex-shrink-0">
                    <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700/50 rounded-lg flex flex-col justify-end p-3">
                        <div className="h-4 bg-gray-300 dark:bg-gray-600/50 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-300 dark:bg-gray-600/50 rounded w-1/4"></div>
                    </div>
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

export const RecommendationSkeleton: React.FC = () => (
    <div className="space-y-2 animate-pulse">
        {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md">
                <div className="flex items-center space-x-2 flex-1">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                </div>
                <div className="h-6 w-6 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
            </div>
        ))}
    </div>
);


export const ActivitySkeleton: React.FC = () => (
    <div className="space-y-4 animate-pulse">
        {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-start space-x-4 shadow-md">
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                    <div className="pt-2">
                        <div className="bg-gray-100 dark:bg-gray-700/50 rounded flex items-center p-2">
                            <div className="w-10 h-14 rounded bg-gray-200 dark:bg-gray-600"></div>
                            <div className="ml-3 flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-5/6"></div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ))}
    </div>
);