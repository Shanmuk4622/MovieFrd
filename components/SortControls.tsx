import React from 'react';
import { cn } from '../utils/cn';

export type SortKey = 'default' | 'release_date' | 'popularity';

interface SortControlsProps {
  currentSort: SortKey;
  onSortChange: (sortKey: SortKey) => void;
}

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'default', label: 'Default' },
  { key: 'release_date', label: 'Newest' },
  { key: 'popularity', label: 'Popular' },
];

const SortControls: React.FC<SortControlsProps> = ({ currentSort, onSortChange }) => (
  <div className="inline-flex items-center gap-1 rounded-full bg-surface-100 p-1 dark:bg-surface-800/60">
    {sortOptions.map((option) => (
      <button
        key={option.key}
        onClick={() => onSortChange(option.key)}
        aria-pressed={currentSort === option.key}
        className={cn(
          'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4',
          currentSort === option.key
            ? 'bg-brand-600 text-white shadow-sm'
            : 'text-surface-600 hover:bg-surface-200 dark:text-surface-300 dark:hover:bg-surface-700'
        )}
      >
        {option.label}
      </button>
    ))}
  </div>
);

export default SortControls;
