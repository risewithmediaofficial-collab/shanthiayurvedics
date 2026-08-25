import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-2xl',
  showClose = true,
  footer = null
}) {
  // Background scroll restriction and ESC key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      // Save current scroll position and strictly restrict background scrolling
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow || 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Map standard modal max-width classes to responsive slide-over drawer widths
  const getDrawerWidthClass = () => {
    switch (maxWidth) {
      case 'max-w-sm':
        return 'sm:max-w-sm';
      case 'max-w-md':
        return 'sm:max-w-md';
      case 'max-w-lg':
        return 'sm:max-w-lg';
      case 'max-w-xl':
        return 'sm:max-w-xl';
      case 'max-w-3xl':
        return 'sm:max-w-2xl md:max-w-3xl';
      case 'max-w-4xl':
        return 'sm:max-w-2xl md:max-w-3xl lg:max-w-4xl';
      case 'max-w-5xl':
        return 'sm:max-w-3xl md:max-w-4xl lg:max-w-5xl';
      default:
        return 'sm:max-w-xl md:max-w-2xl';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end" role="dialog" aria-modal="true">
      {/* Darkened Blur Backdrop with Fade-In */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Right Drawer Panel */}
      <div
        className={twMerge(
          clsx(
            'relative w-full h-full bg-white shadow-2xl flex flex-col z-50 border-l border-slate-200 animate-slide-in-right',
            getDrawerWidthClass()
          )
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        {(title || showClose) && (
          <div className="px-5 py-4 sm:px-6 sm:py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
            <div className="pr-4">
              {title && (
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>

            {showClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close panel"
                className="rounded-xl p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition-colors focus:outline-none cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {children}
        </div>

        {/* Optional Pinned Footer */}
        {footer && (
          <div className="px-5 py-4 sm:px-6 border-t border-slate-100 bg-slate-50/80 shrink-0 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
