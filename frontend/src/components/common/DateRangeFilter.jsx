import React from 'react';
import { Calendar, X, Clock } from 'lucide-react';

/**
 * Reusable Date-to-Date range filter component with quick presets
 * @param {string} startDate - 'YYYY-MM-DD'
 * @param {string} endDate - 'YYYY-MM-DD'
 * @param {Function} onChange - ({ startDate, endDate }) => void
 * @param {string} label - Optional custom label
 */
export function DateRangeFilter({
  startDate = '',
  endDate = '',
  onChange,
  label = 'Date Range'
}) {
  const formatDateStr = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handlePreset = (presetKey) => {
    const today = new Date();
    let start = '';
    let end = formatDateStr(today);

    switch (presetKey) {
      case 'TODAY':
        start = end;
        break;
      case 'YESTERDAY': {
        const yest = new Date();
        yest.setDate(yest.getDate() - 1);
        start = formatDateStr(yest);
        end = start;
        break;
      }
      case 'LAST_7_DAYS': {
        const d7 = new Date();
        d7.setDate(d7.getDate() - 6);
        start = formatDateStr(d7);
        break;
      }
      case 'THIS_MONTH': {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        start = formatDateStr(firstDay);
        break;
      }
      case 'LAST_30_DAYS': {
        const d30 = new Date();
        d30.setDate(d30.getDate() - 29);
        start = formatDateStr(d30);
        break;
      }
      case 'CLEAR':
        start = '';
        end = '';
        break;
      default:
        break;
    }

    onChange({ startDate: start, endDate: end });
  };

  const hasActiveFilter = Boolean(startDate || endDate);

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      {/* Date Pickers Container */}
      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border bg-white shadow-2xs transition-colors ${
        hasActiveFilter ? 'border-indigo-400 ring-2 ring-indigo-50' : 'border-slate-200 hover:border-slate-300'
      }`}>
        <Calendar className={`w-3.5 h-3.5 shrink-0 ${hasActiveFilter ? 'text-indigo-600' : 'text-slate-400'}`} />
        
        <div className="flex items-center gap-1">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onChange({ startDate: e.target.value, endDate })}
              className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer p-0"
              title="Filter from date"
            />
          </div>

          <span className="text-slate-300 font-bold px-0.5">→</span>

          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none">To</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onChange({ startDate, endDate: e.target.value })}
              className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer p-0"
              title="Filter to date"
            />
          </div>
        </div>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => handlePreset('CLEAR')}
            className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors ml-1 cursor-pointer"
            title="Clear date filter"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Quick Presets Dropdown */}
      <div className="relative">
        <select
          onChange={(e) => {
            if (e.target.value) {
              handlePreset(e.target.value);
              e.target.value = '';
            }
          }}
          defaultValue=""
          className="px-2 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 focus:outline-none cursor-pointer shadow-2xs"
          title="Quick date presets"
        >
          <option value="" disabled>⚡ Quick Presets</option>
          <option value="TODAY">Today</option>
          <option value="YESTERDAY">Yesterday</option>
          <option value="LAST_7_DAYS">Last 7 Days</option>
          <option value="THIS_MONTH">This Month</option>
          <option value="LAST_30_DAYS">Last 30 Days</option>
          {hasActiveFilter && <option value="CLEAR">Clear Dates</option>}
        </select>
      </div>
    </div>
  );
}

export default DateRangeFilter;
