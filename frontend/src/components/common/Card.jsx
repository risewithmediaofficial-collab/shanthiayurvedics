import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Card({ children, className, title, subtitle, action, headerClassName, bodyClassName, ...props }) {
  return (
    <div className={twMerge('bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden', className)} {...props}>
      {(title || action) && (
        <div className={twMerge('px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4', headerClassName)}>
          <div>
            {title && <h3 className="text-base font-semibold text-slate-800">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={twMerge('p-5', bodyClassName)}>{children}</div>
    </div>
  );
}

export default Card;
