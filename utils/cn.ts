import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional class names and resolve Tailwind conflicts. */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
