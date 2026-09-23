import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * Reusable Sort Selector Dropdown
 * @param {Array<{ value: string, label: string }>} options - Sort field options
 * @param {string} sortBy - Active sort field
 * @param {string} sortOrder - 'asc' | 'desc'
 * @param {Function} onSortChange - (sortBy: string, sortOrder: string) => void
 */
export function SortDropdown({
  options = [],
  sortBy,
  sortOrder = 'desc',
  onSortChange
}) {
  const toggleOrder = () => {
    onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="inline-flex items-center gap-1 bg-white rounded-xl border border-slate-200 px-2 py-1 shadow-2xs">
      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">Sort:</span>
      
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value, sortOrder)}
        className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer pr-1"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={toggleOrder}
        className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
        title={`Sort ${sortOrder === 'asc' ? 'Ascending (Click for Descending)' : 'Descending (Click for Ascending)'}`}
      >
        {sortOrder === 'asc' ? (
          <ArrowUp className="w-3.5 h-3.5 text-indigo-600 font-bold" />
        ) : (
          <ArrowDown className="w-3.5 h-3.5 text-indigo-600 font-bold" />
        )}
      </button>
    </div>
  );
}

export default SortDropdown;
