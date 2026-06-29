import React from 'react';
import { cn } from '../../utils/cn';

const fieldBase =
  'w-full rounded-xl bg-surface-100 px-4 py-2.5 text-surface-900 placeholder-surface-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-800 dark:text-white dark:placeholder-surface-500';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, ...props }, ref) => {
    if (leftIcon) {
      return (
        <div className="relative w-full">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">
            {leftIcon}
          </span>
          <input ref={ref} className={cn(fieldBase, 'pl-10', className)} {...props} />
        </div>
      );
    }
    return <input ref={ref} className={cn(fieldBase, className)} {...props} />;
  }
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldBase, 'resize-none', className)} {...props} />
));
Textarea.displayName = 'Textarea';

export default Input;
