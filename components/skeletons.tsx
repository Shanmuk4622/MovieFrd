import React from 'react';

export const MovieListSkeleton: React.FC = () => (
  <section className="mb-10">
    <div className="skeleton mb-4 ml-4 h-8 w-1/3 rounded-lg md:ml-0" />
    <div className="flex gap-4 overflow-x-hidden pb-4 pl-4 md:pl-0">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="w-40 flex-shrink-0 md:w-48">
          <div className="skeleton aspect-[2/3] rounded-2xl" />
        </div>
      ))}
    </div>
  </section>
);

export const FriendListSkeleton: React.FC = () => (
  <div className="space-y-2">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="flex items-center justify-between rounded-xl bg-surface-100 p-2.5 dark:bg-surface-800/60">
        <div className="skeleton h-4 w-1/2 rounded" />
        <div className="skeleton h-6 w-6 rounded-full" />
      </div>
    ))}
  </div>
);

export const RecommendationSkeleton: React.FC = () => (
  <div className="space-y-2">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center justify-between rounded-xl bg-surface-100 p-2.5 dark:bg-surface-800/60">
        <div className="flex flex-1 items-center gap-2">
          <div className="skeleton h-8 w-8 rounded-full" />
          <div className="skeleton h-4 w-1/2 rounded" />
        </div>
        <div className="skeleton h-6 w-6 rounded-full" />
      </div>
    ))}
  </div>
);

export const ActivitySkeleton: React.FC = () => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="card-surface flex items-start gap-4 p-4">
        <div className="skeleton h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2 py-1">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/4 rounded" />
          <div className="skeleton mt-2 h-16 w-full rounded-xl" />
        </div>
      </div>
    ))}
  </div>
);
