import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
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
          {/* Header */}
          <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
            <div>
              {title && <h3 className="text-base font-semibold text-slate-900">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="relative flex-1 overflow-y-auto p-6 space-y-4">{children}</div>

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
