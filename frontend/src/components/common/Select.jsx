import React, { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { CustomSelect } from './CustomSelect.jsx';

/**
 * Common Select component — powered by CustomSelect with animated Tailwind styling,
 * status indicators, smooth hover & focus effects, and accessible keyboard support.
 */
export const Select = forwardRef(function Select(
  {
    label,
    error,
    helperText,
    options = [],
    placeholder,
    className,
    containerClassName,
    id,
    name,
    required,
    value,
    onChange,
    disabled,
    size = 'md',
    minWidth = 'min-w-full',
    ...props
  },
  ref
) {
  return (
    <CustomSelect
      id={id}
      name={name}
      label={label}
      error={error}
      helperText={helperText}
      options={options}
      placeholder={placeholder}
      className={twMerge('w-full', className)}
      containerClassName={twMerge('w-full block', containerClassName)}
      minWidth={minWidth}
      required={required}
      value={value}
      onChange={onChange}
      disabled={disabled}
      size={size}
      {...props}
    />
  );
});

export default Select;
