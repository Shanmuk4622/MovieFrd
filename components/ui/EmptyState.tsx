import React from 'react';
import { cn } from '../../utils/cn';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Centered placeholder for empty lists / no-results states. */
const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className }) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-200 px-6 py-12 text-center dark:border-surface-800',
      className
    )}
  >
    {icon && <div className="mb-4 text-surface-300 dark:text-surface-600">{icon}</div>}
    <h3 className="text-lg font-bold text-surface-900 dark:text-white">{title}</h3>
    {description && (
      <p className="mt-1 max-w-md text-sm text-surface-500 dark:text-surface-400">{description}</p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export default EmptyState;
