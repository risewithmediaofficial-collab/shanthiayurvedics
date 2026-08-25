import React, { forwardRef, useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Eye, EyeOff } from 'lucide-react';

export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    icon: Icon,
    className,
    containerClassName,
    id,
    required,
    type = 'text',
    showPasswordToggle = true,
    ...props
  },
  ref
) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const isPasswordType = type === 'password';
  const effectiveType = isPasswordType && showPassword ? 'text' : type;

  return (
    <div className={twMerge('w-full space-y-1.5', containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 tracking-wide">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative rounded-lg shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={effectiveType}
          className={twMerge(
            clsx(
              'w-full px-3 py-2 text-sm bg-white border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none transition-all duration-150',
              Icon ? 'pl-9' : 'pl-3',
              isPasswordType && showPasswordToggle ? 'pr-10' : 'pr-3',
              error
                ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                : 'border-slate-300 focus:border-ayur-600 focus:ring-2 focus:ring-ayur-500/20',
              props.disabled && 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200',
              className
            )
          )}
          {...props}
        />
        {isPasswordType && showPasswordToggle && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4 text-ayur-700" />
            ) : (
              <Eye className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            )}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
});

export default Input;
