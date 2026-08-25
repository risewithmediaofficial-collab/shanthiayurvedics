import React, { useEffect } from 'react';
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
        onClose();
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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className={clsx('fixed inset-y-0 flex max-w-full', position === 'right' ? 'right-0 pl-10' : 'left-0 pr-10')}>
        <div className={twMerge('w-screen bg-white shadow-2xl flex flex-col', size)}>
          {/* Header */}
          <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
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
          <div className="relative flex-1 overflow-y-auto p-6">{children}</div>

          {/* Footer */}
          {footer && <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export default Drawer;
