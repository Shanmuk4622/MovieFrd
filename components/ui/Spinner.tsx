import React from 'react';
import { cn } from '../../utils/cn';

interface SpinnerProps {
  className?: string;
  /** Tailwind size classes, e.g. "h-5 w-5". */
  size?: string;
}

/** Minimal accessible loading spinner. */
const Spinner: React.FC<SpinnerProps> = ({ className, size = 'h-6 w-6' }) => (
  <span
    role="status"
    aria-label="Loading"
    className={cn(
      'inline-block animate-spin rounded-full border-2 border-current border-t-transparent',
      size,
      className
    )}
  />
);

export default Spinner;
