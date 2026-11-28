import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../../utils/cn';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  size?: ModalSize;
  /** Alias for `size` to stay compatible with Dialog-style callers. */
  maxWidth?: ModalSize;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  footerClassName?: string;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-5xl',
};

/**
 * Tracks open modal IDs in LIFO order so pressing Escape closes only the
 * topmost modal and body scroll remains locked until the last modal closes.
 */
const openModalStack: string[] = [];

function syncBodyScrollLock() {
  if (typeof document === 'undefined') return;
  if (openModalStack.length > 0) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

interface ModalErrorBoundaryProps {
  onClose: () => void;
  children: React.ReactNode;
}

interface ModalErrorBoundaryState {
  hasError: boolean;
}

class ModalErrorBoundary extends React.Component<
  ModalErrorBoundaryProps,
  ModalErrorBoundaryState
> {
  state: ModalErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ModalErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="font-semibold">Unable to display modal content</p>
            <p className="text-xs text-rose-700">
              An unexpected display error occurred inside this dialog. Close and try again.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onClose();
              }}
              className="px-3 py-1.5 rounded bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  size,
  maxWidth = 'xl',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  footer,
  children,
  className,
  bodyClassName,
  footerClassName,
}) => {
  const modalId = useId();
  const titleId = `${modalId}-title`;
  const descriptionId = `${modalId}-desc`;
  const resolvedSize = size ?? maxWidth;

  useEffect(() => {
    if (!isOpen) return;

    openModalStack.push(modalId);
    syncBodyScrollLock();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!closeOnEscape || e.key !== 'Escape') return;
      const topModalId = openModalStack[openModalStack.length - 1];
      if (topModalId === modalId) {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      const idx = openModalStack.lastIndexOf(modalId);
      if (idx !== -1) {
        openModalStack.splice(idx, 1);
      }
      syncBodyScrollLock();
    };
  }, [isOpen, modalId, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        onClick={closeOnBackdropClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          'relative z-10 w-full max-h-[calc(100vh-2rem)] flex flex-col rounded-lg bg-surface border border-surface-border shadow-xl overflow-hidden',
          SIZE_CLASSES[resolvedSize] ?? SIZE_CLASSES.xl,
          className
        )}
      >
        {(title || description || icon || showCloseButton) && (
          <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-surface-border shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div className="p-2 rounded-md bg-surface-elevated border border-surface-border text-slate-600 shrink-0">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <h3 id={titleId} className="text-sm font-semibold text-slate-900 truncate">
                    {title}
                  </h3>
                )}
                {description && (
                  <p id={descriptionId} className="text-xs text-slate-500 mt-0.5">
                    {description}
                  </p>
                )}
              </div>
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-surface-elevated transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Body */}
        <div className={cn('p-5 overflow-y-auto flex-1', bodyClassName)}>
          <ModalErrorBoundary onClose={onClose}>{children}</ModalErrorBoundary>
        </div>

        {/* Footer */}
        {footer && (
          <div
            className={cn(
              'px-5 py-3.5 bg-canvas/60 border-t border-surface-border flex items-center justify-end gap-2.5 shrink-0',
              footerClassName
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(content, document.body);
  }
  return content;
};
