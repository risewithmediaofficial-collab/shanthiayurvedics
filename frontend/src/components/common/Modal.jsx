import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Full-height right-side slide-over drawer panel attached to document.body via createPortal.
 *
 * Props:
 *  - isOpen       {boolean}
 *  - onClose      {() => void}
 *  - title        {string}
 *  - subtitle     {string}
 *  - children     {ReactNode}  — scrollable body content
 *  - footer       {ReactNode}  — pinned bottom action bar
 *  - maxWidth     {string}     — width variant e.g. 'max-w-md' | 'max-w-lg' | 'max-w-2xl' | 'max-w-3xl'
 *  - showClose    {boolean}
 *  - icon         {ReactNode}  — optional icon/emoji next to title
 */
export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-2xl',
  showClose = true,
  footer = null,
  icon = null
}) {
  /* ── lock background scroll & ESC key ── */
  useEffect(() => {
    if (!isOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prev || '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  /* ── map maxWidth to clean width class ── */
  const getWidthClass = () => {
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
        return 'sm:max-w-3xl';
      case 'max-w-4xl':
        return 'sm:max-w-4xl';
      case 'max-w-5xl':
        return 'sm:max-w-5xl';
      case 'max-w-2xl':
      default:
        return 'sm:max-w-2xl';
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex justify-end overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Full-Height Right Drawer Panel */}
      <div
        className={`relative w-full ${getWidthClass()} h-full min-h-screen bg-white shadow-2xl flex flex-col z-10 border-l border-slate-200 animate-slide-in-right`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        {(title || showClose) && (
          <div className="shrink-0 px-6 py-4.5 border-b border-slate-100 bg-white flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              {icon && (
                <div className="w-9 h-9 rounded-xl bg-ayur-50 border border-ayur-100 flex items-center justify-center text-lg shrink-0">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug truncate">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>
                )}
              </div>
            </div>

            {showClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
          {children}
        </div>

        {/* Sticky Footer */}
        {footer && (
          <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default Modal;
