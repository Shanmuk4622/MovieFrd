import React from 'react';
import { cn } from '../../utils/cn';

type Tone = 'brand' | 'neutral' | 'amber' | 'green' | 'count';

const tones: Record<Tone, string> = {
  brand: 'bg-brand-500/15 text-brand-600 dark:text-brand-300',
  neutral: 'bg-surface-200 text-surface-700 dark:bg-surface-700 dark:text-surface-200',
  amber: 'bg-amber-400/20 text-amber-600 dark:text-amber-300',
  green: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  count: 'bg-brand-600 text-white',
};

interface BadgeProps {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', className, children }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
      tones[tone],
      className
    )}
  >
    {children}
  </span>
);

export default Badge;
