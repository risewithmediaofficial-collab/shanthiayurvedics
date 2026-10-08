import React, { useState } from 'react';
import { Calendar, X } from 'lucide-react';

/**
 * Reusable Date-to-Date range filter component with quick presets & custom date pickers
 * Supports: All Time | Today | Yesterday | This Month | Date to Date
 * @param {string} startDate - 'YYYY-MM-DD'
 * @param {string} endDate - 'YYYY-MM-DD'
 * @param {Function} onChange - ({ startDate, endDate }) => void
 * @param {string} label - Optional custom label
 */
export function DateRangeFilter({
  startDate = '',
  endDate = '',
  onChange,
  label = 'Date'
}) {
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const formatDateStr = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getTodayStr = () => formatDateStr(new Date());

  const getYesterdayStr = () => {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    return formatDateStr(yest);
  };

  const getThisMonthStartStr = () => {
    const today = new Date();
    return formatDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  // Determine which preset is currently active
  const activePreset = (() => {
    if (!startDate && !endDate) return 'ALL';
    const todayStr = getTodayStr();
    const yestStr = getYesterdayStr();
    const monthStartStr = getThisMonthStartStr();

    if (startDate === todayStr && endDate === todayStr) return 'TODAY';
    if (startDate === yestStr && endDate === yestStr) return 'YESTERDAY';
    if (startDate === monthStartStr && (endDate === todayStr || !endDate)) return 'THIS_MONTH';
    return 'CUSTOM';
  })();

  const handleSelectPreset = (presetKey) => {
    const todayStr = getTodayStr();

    switch (presetKey) {
      case 'ALL':
        setShowCustomPicker(false);
        onChange({ startDate: '', endDate: '' });
        break;
      case 'TODAY':
        setShowCustomPicker(false);
        onChange({ startDate: todayStr, endDate: todayStr });
        break;
      case 'YESTERDAY': {
        const yestStr = getYesterdayStr();
        setShowCustomPicker(false);
        onChange({ startDate: yestStr, endDate: yestStr });
        break;
      }
      case 'THIS_MONTH': {
        const monthStartStr = getThisMonthStartStr();
        setShowCustomPicker(false);
        onChange({ startDate: monthStartStr, endDate: todayStr });
        break;
      }
      case 'CUSTOM':
        setShowCustomPicker(true);
        if (!startDate) {
          onChange({ startDate: getThisMonthStartStr(), endDate: todayStr });
        }
        break;
      default:
        break;
    }
  };

  const hasActiveFilter = Boolean(startDate || endDate);

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs max-w-full">
      {/* Quick Filter Preset Pills */}
      <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/90 overflow-x-auto scrollbar-none max-w-full">
        {[
          { key: 'ALL', label: 'All Time' },
          { key: 'TODAY', label: 'Today' },
          { key: 'YESTERDAY', label: 'Yesterday' },
          { key: 'THIS_MONTH', label: 'This Month' },
          { key: 'CUSTOM', label: '📅 Date to Date' }
        ].map((preset) => {
          const isActive = activePreset === preset.key;
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => handleSelectPreset(preset.key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold border border-emerald-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Date-to-Date Inputs (shown when CUSTOM or when active filter is set) */}
      {(showCustomPicker || activePreset === 'CUSTOM') && (
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 px-2.5 py-1 rounded-xl border border-emerald-300 bg-emerald-50/50 shadow-2xs animate-in fade-in max-w-full">
          <Calendar className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
          
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onChange({ startDate: e.target.value, endDate })}
                className="text-xs font-semibold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                title="Start Date"
              />
            </div>

            <span className="text-slate-400 font-bold hidden sm:inline">→</span>

            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onChange({ startDate, endDate: e.target.value })}
                className="text-xs font-semibold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                title="End Date"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSelectPreset('ALL')}
            className="p-1 rounded-full hover:bg-emerald-100 text-emerald-700 transition-colors ml-auto sm:ml-0.5 cursor-pointer"
            title="Reset to All Time"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default DateRangeFilter;

