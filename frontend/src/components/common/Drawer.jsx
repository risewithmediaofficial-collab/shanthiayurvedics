import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  position = 'right',
  size = 'max-w-md',
  footer
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const drawerContent = (
    <div className="fixed inset-0 z-[100] overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className={clsx('fixed inset-y-0 flex max-w-full', position === 'right' ? 'right-0' : 'left-0')}>
        <div className={twMerge('w-screen h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slide-in-right', size)}>
          {/* Header with generous top padding away from URL tab and clean text alignment */}
          <div className="px-6 sm:px-7 pt-7 sm:pt-8 pb-4.5 sm:pb-5 border-b border-slate-100 flex items-start justify-between bg-white shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-start gap-3.5 min-w-0 pr-3">
              {icon && (
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5 shadow-xs">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {title && <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">{title}</h3>}
                {subtitle && <p className="text-xs text-slate-500 mt-1 font-medium leading-normal">{subtitle}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 -mr-1 -mt-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer shrink-0"
              aria-label="Close drawer"
            >
              <CloseRounded sx={{ fontSize: 20 }} />
            </button>
          </div>

          {/* Body */}
          <div className="relative flex-1 overflow-y-auto p-6 sm:p-7 space-y-4">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 shrink-0 flex justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
}

export default Drawer;
