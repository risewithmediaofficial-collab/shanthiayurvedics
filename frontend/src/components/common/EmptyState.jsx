import React from 'react';
import { Inbox } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { Button } from './Button.jsx';

export function EmptyState({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There are no items to display matching your criteria.',
  actionLabel,
  onAction,
  className
}) {
  return (
    <div className={twMerge('flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-dashed border-slate-200', className)}>
      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-base font-semibold text-slate-800 mb-1">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
