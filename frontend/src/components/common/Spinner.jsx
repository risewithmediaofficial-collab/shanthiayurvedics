import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Spinner({ size = 'md', className, text }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
    xl: 'w-16 h-16'
  };

  return (
    <div className={twMerge('flex flex-col items-center justify-center gap-3 p-4', className)}>
      <Loader2 className={clsx('animate-spin text-ayur-700', sizes[size])} />
      {text && <p className="text-sm font-medium text-slate-500">{text}</p>}
    </div>
  );
}

export default Spinner;
