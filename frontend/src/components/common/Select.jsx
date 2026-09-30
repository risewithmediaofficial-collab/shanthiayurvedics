import React, { forwardRef, useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Select = forwardRef(function Select(
  { label, error, helperText, options = [], placeholder, className, containerClassName, id, required, 'aria-describedby': describedBy, ...props },
  ref
) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const feedbackId = error || helperText ? `${selectId}-feedback` : undefined;

  return (
    <div className={twMerge('w-full space-y-1.5', containerClassName)}>
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-slate-700 tracking-wide">
          {label} {required && <span className="text-rose-500" aria-hidden="true">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={[describedBy, feedbackId].filter(Boolean).join(' ') || undefined}
        className={twMerge(
          clsx(
            'w-full min-h-10 px-3 py-2 text-sm bg-white border rounded-lg text-slate-900 focus:outline-none transition-colors duration-150',
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
      {error && <p id={feedbackId} role="alert" className="text-xs text-rose-600 font-medium">{error}</p>}
      {!error && helperText && <p id={feedbackId} className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
});

export default Select;
