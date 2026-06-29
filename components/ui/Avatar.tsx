import React from 'react';
import { cn } from '../../utils/cn';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  /** Tailwind size classes, e.g. "h-10 w-10". */
  size?: string;
  className?: string;
}

const initialsOf = (name?: string | null) =>
  (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';

/** Deterministic background hue from the name, so avatars feel stable per user. */
const hueOf = (name?: string | null) => {
  const s = name || '';
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
};

/** Avatar with a graceful initials fallback (replaces pravatar/placeholder URLs). */
const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'h-10 w-10', className }) => {
  const [errored, setErrored] = React.useState(false);
  const showImage = src && !errored;

  if (showImage) {
    return (
      <img
        src={src}
        alt={name || 'User avatar'}
        onError={() => setErrored(true)}
        className={cn('rounded-full object-cover', size, className)}
      />
    );
  }

  return (
    <span
      aria-label={name || 'User avatar'}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-bold text-white',
        size,
        className
      )}
      style={{ backgroundColor: `hsl(${hueOf(name)} 55% 45%)` }}
    >
      <span className="text-[0.8em]">{initialsOf(name)}</span>
    </span>
  );
};

export default Avatar;
