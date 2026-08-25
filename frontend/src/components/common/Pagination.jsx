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
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 sm:px-6 rounded-b-xl">
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-slate-600">
            Showing <span className="font-semibold text-slate-900">{start}</span> to{' '}
            <span className="font-semibold text-slate-900">{end}</span> of{' '}
            <span className="font-semibold text-slate-900">{totalItems}</span> results
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="xs"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            icon={ChevronLeft}
          >
            Previous
          </Button>

          <div className="text-xs font-medium text-slate-700 px-2">
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
