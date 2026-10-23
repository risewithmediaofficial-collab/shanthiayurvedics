import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Card({ children, className, title, subtitle, action, headerClassName, bodyClassName, ...props }) {
  return (
    <div className={twMerge('bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden w-full max-w-full', className)} {...props}>
      {(title || action) && (
        <div className={twMerge('px-3.5 sm:px-5 py-3 sm:py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4', headerClassName)}>
          <div className="min-w-0 flex-1">
            {title && <h3 className="text-sm sm:text-base font-semibold text-slate-800">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex items-center flex-wrap gap-2 shrink-0">{action}</div>}
        </div>
      )}
      <div className={twMerge('p-3.5 sm:p-5 min-w-0', bodyClassName)}>{children}</div>
    </div>
  );
}

export default Card;
