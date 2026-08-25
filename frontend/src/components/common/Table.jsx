import React from 'react';
import { twMerge } from 'tailwind-merge';
import { Spinner } from './Spinner.jsx';
import { EmptyState } from './EmptyState.jsx';
import { Pagination } from './Pagination.jsx';

export function Table({
  columns = [],
  data = [],
  isLoading = false,
  emptyTitle = 'No data available',
  emptyDescription = 'No records match the selected criteria.',
  pagination,
  onPageChange,
  className,
  onRowClick
}) {
  return (
    <div className={twMerge('w-full overflow-hidden bg-white rounded-xl border border-slate-200 shadow-card', className)}>
      <div className="overflow-x-auto">
        <table className="crm-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={col.key || idx} className={twMerge(col.className, col.align === 'right' && 'text-right', col.align === 'center' && 'text-center')}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  <Spinner size="md" text="Loading data..." />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0 border-none">
                  <EmptyState title={emptyTitle} description={emptyDescription} className="rounded-none border-none my-6" />
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={row._id || row.id || rowIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={twMerge('transition-colors', onRowClick && 'cursor-pointer hover:bg-slate-50/80')}
                >
                  {columns.map((col, colIdx) => {
                    const value = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor || col.key];
                    return (
                      <td
                        key={col.key || colIdx}
                        className={twMerge(
                          col.className,
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center'
                        )}
                      >
                        {col.render ? col.render(value, row) : (value ?? '-')}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination && onPageChange && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          limit={pagination.limit}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

export default Table;
