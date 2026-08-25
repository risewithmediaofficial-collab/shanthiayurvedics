import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Badge({ children, variant = 'default', size = 'md', className }) {
  const variants = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    primary: 'bg-ayur-50 text-ayur-800 border-ayur-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const sizes = {
    sm: 'px-1.5 py-0.5 text-[10px] font-semibold',
    md: 'px-2.5 py-0.5 text-xs font-semibold',
    lg: 'px-3 py-1 text-sm font-semibold',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1 rounded-full border tracking-wide uppercase font-sans',
          variants[variant] || variants.default,
          sizes[size],
          className
        )
      )}
    >
      {children}
    </span>
  );
}

export default Badge;
