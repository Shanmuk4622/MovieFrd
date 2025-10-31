import React from 'react';

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

const SortControls: React.FC<SortControlsProps> = ({ currentSort, onSortChange }) => {
  return (
    <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800/50 p-1 rounded-full">
      {sortOptions.map(option => (
        <button
          key={option.key}
          onClick={() => onSortChange(option.key)}
          className={`px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${
            currentSort === option.key
              ? 'bg-red-600 text-white shadow'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          aria-pressed={currentSort === option.key}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default SortControls;
