import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button.jsx';

export function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  limit = 20,
  onPageChange
}) {
  if (totalPages <= 1 && totalItems <= limit) return null;

  const start = Math.min((currentPage - 1) * limit + 1, totalItems);
  const end = Math.min(currentPage * limit, totalItems);

  return (
    <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 bg-white border-t border-slate-200 rounded-b-xl w-full">
      <div className="flex flex-col xs:flex-row items-center justify-between gap-2.5 sm:gap-3 w-full">
        <div>
          <p className="text-xs text-slate-600 text-center xs:text-left">
            Showing <span className="font-semibold text-slate-900">{start}</span> to{' '}
            <span className="font-semibold text-slate-900">{end}</span> of{' '}
            <span className="font-semibold text-slate-900">{totalItems}</span> results
          </p>
        </div>
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 shrink-0">
          <Button
            variant="secondary"
            size="xs"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            icon={ChevronLeft}
          >
            Previous
          </Button>

          <div aria-live="polite" className="text-xs font-medium text-slate-700 px-1 sm:px-2 whitespace-nowrap">
            Page {currentPage} of {totalPages}
          </div>

          <Button
            variant="secondary"
            size="xs"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            icon={ChevronRight}
            iconPosition="right"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Pagination;
