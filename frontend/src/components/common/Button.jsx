import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  type = 'button',
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary: 'text-white bg-ayur-700 hover:bg-ayur-800 active:bg-ayur-900 shadow-sm focus:ring-ayur-500/30',
    secondary: 'text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 shadow-subtle focus:ring-slate-400/20',
    outline: 'text-ayur-700 bg-transparent hover:bg-ayur-50 active:bg-ayur-100 border border-ayur-600 focus:ring-ayur-500/20',
    ghost: 'text-slate-600 hover:bg-slate-100 active:bg-slate-200 focus:ring-slate-400/20',
    danger: 'text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-sm focus:ring-rose-500/30',
    success: 'text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm focus:ring-emerald-500/30',
  };

  const sizes = {
    xs: 'px-2 py-1 text-xs gap-1.5',
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        Icon && iconPosition === 'left' && <Icon className="w-4 h-4" />
      )}
      <span>{children}</span>
      {!isLoading && Icon && iconPosition === 'right' && <Icon className="w-4 h-4" />}
    </button>
  );
}

export default Button;
