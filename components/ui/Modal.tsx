import React, { useEffect, useRef } from 'react';
import { cn } from '../../utils/cn';
import { XIcon } from '../icons';
import IconButton from './IconButton';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Tailwind max-width class for the dialog. */
  maxWidth?: string;
  /** When false, the body region won't scroll internally (caller manages it). */
  scrollBody?: boolean;
}

/**
 * Accessible modal: backdrop click + Escape to close, body scroll lock, and an
 * initial focus move into the dialog.
 */
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-2xl',
  scrollBody = true,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in-fast"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'card-surface flex max-h-[90vh] w-full flex-col overflow-hidden outline-none animate-scale-in',
          maxWidth
        )}
      >
        {(title || subtitle) && (
          <div className="flex items-start justify-between gap-4 border-b border-surface-200/70 px-5 py-4 dark:border-surface-800">
            <div className="min-w-0">
              {title && (
                <h2 className="text-lg font-bold text-surface-900 dark:text-white">{title}</h2>
              )}
              {subtitle && (
                <p className="mt-0.5 truncate text-sm text-surface-500 dark:text-surface-400">
                  {subtitle}
                </p>
              )}
            </div>
            <IconButton aria-label="Close dialog" onClick={onClose} className="-mr-1 shrink-0">
              <XIcon className="h-5 w-5" />
            </IconButton>
          </div>
        )}

        <div className={cn('min-h-0 flex-1', scrollBody && 'overflow-y-auto scrollbar-thin')}>
          {children}
        </div>

        {footer && (
          <div className="border-t border-surface-200/70 px-5 py-4 dark:border-surface-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
