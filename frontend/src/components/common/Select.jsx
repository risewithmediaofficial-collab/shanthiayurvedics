import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Select = forwardRef(function Select(
  { label, error, helperText, options = [], placeholder, className, containerClassName, id, required, ...props },
  ref
) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={twMerge('w-full space-y-1.5', containerClassName)}>
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-slate-700 tracking-wide">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={twMerge(
          clsx(
            'w-full px-3 py-2 text-sm bg-white border rounded-lg text-slate-900 focus:outline-none transition-all duration-150',
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
              : 'border-slate-300 focus:border-ayur-600 focus:ring-2 focus:ring-ayur-500/20',
            props.disabled && 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200',
            className
          )
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
});

export default Select;
