import React, { useState, useRef, useEffect, useId, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

// Helper status colors for orders
const STATUS_COLORS = {
  NEW: { dot: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-700', badge: 'New' },
  CONFIRMED: { dot: '#8b5cf6', bg: 'bg-purple-50', text: 'text-purple-700', badge: 'Confirmed' },
  PROCESSING: { dot: '#06b6d4', bg: 'bg-cyan-50', text: 'text-cyan-700', badge: 'Processing' },
  READY_FOR_PACKING: { dot: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700', badge: 'Ready for Packing' },
  PACKED: { dot: '#d97706', bg: 'bg-amber-100', text: 'text-amber-800', badge: 'Packed' },
  READY_FOR_DISPATCH: { dot: '#6366f1', bg: 'bg-indigo-50', text: 'text-indigo-700', badge: 'Ready to Dispatch' },
  DISPATCHED: { dot: '#0284c7', bg: 'bg-sky-50', text: 'text-sky-700', badge: 'Dispatched' },
  IN_TRANSIT: { dot: '#0284c7', bg: 'bg-sky-50', text: 'text-sky-700', badge: 'In Transit' },
  OUT_FOR_DELIVERY: { dot: '#0d9488', bg: 'bg-teal-50', text: 'text-teal-700', badge: 'Out for Delivery' },
  DELIVERED: { dot: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700', badge: 'Delivered' },
  DELIVERY_FAILED: { dot: '#ef4444', bg: 'bg-red-50', text: 'text-red-700', badge: 'Delivery Failed' },
  RTO: { dot: '#f43f5e', bg: 'bg-rose-50', text: 'text-rose-700', badge: 'RTO' },
  CANCELLED: { dot: '#64748b', bg: 'bg-slate-100', text: 'text-slate-600', badge: 'Cancelled' },
};

/**
 * CustomSelect — modern Tailwind dropdown with rich micro-animations,
 * status dot indicators, customizable alignments, and clean transitions.
 */
export function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  disabled = false,
  size = 'sm',
  align = 'left',
  minWidth = 'min-w-[160px]',
  className = '',
  containerClassName = '',
  triggerClassName = '',
  menuClassName = '',
  label,
  error,
  helperText,
  id,
  name,
  required,
  icon: IconComponent,
  searchable = false,
  autoStatusDot = true,
  placement = 'auto',
  dropUp = false,
}) {
  const [open, setOpen] = useState(false);
  const [detectedDropUp, setDetectedDropUp] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const ref = useRef(null);
  const searchInputRef = useRef(null);
  const generatedId = useId();
  const selectId = id || generatedId;

  // Normalize options to { value, label, dot, badge, icon, disabled }
  const normalizedOptions = useMemo(() => {
    return (options || []).map((opt) => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        const val = String(opt);
        const statusMeta = autoStatusDot ? STATUS_COLORS[val] : null;
        return {
          value: val,
          label: val,
          dot: statusMeta?.dot,
          badge: statusMeta?.badge,
          disabled: false,
        };
      }
      const val = opt.value ?? '';
      const statusMeta = autoStatusDot ? STATUS_COLORS[val] : null;
      return {
        value: val,
        label: opt.label ?? val,
        dot: opt.dot || (statusMeta ? statusMeta.dot : undefined),
        badge: opt.badge,
        icon: opt.icon,
        disabled: Boolean(opt.disabled),
      };
    });
  }, [options, autoStatusDot]);

  // Filtered options based on search
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return normalizedOptions;
    const term = searchTerm.toLowerCase();
    return normalizedOptions.filter((opt) =>
      opt.label.toLowerCase().includes(term) || opt.value.toLowerCase().includes(term)
    );
  }, [normalizedOptions, searchTerm]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard navigation & Esc to close
  useEffect(() => {
    const handleKey = (e) => {
      if (!open) return;
      if (e.key === 'Escape') {
        setOpen(false);
        setSearchTerm('');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      } else if (e.key === 'Enter' && highlightIndex >= 0 && highlightIndex < filteredOptions.length) {
        e.preventDefault();
        const target = filteredOptions[highlightIndex];
        if (!target.disabled) {
          handleSelect(target.value);
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, highlightIndex, filteredOptions]);

  // Focus search input when opened
  useEffect(() => {
    if (open && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    if (open) {
      setHighlightIndex(-1);
    }
  }, [open, searchable]);

  // Handle dropup detection based on available viewport space
  useEffect(() => {
    if (!open) return;
    if (dropUp || placement === 'top') {
      setDetectedDropUp(true);
    } else if (placement === 'bottom') {
      setDetectedDropUp(false);
    } else {
      // placement === 'auto'
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < 290 && spaceAbove > spaceBelow) {
          setDetectedDropUp(true);
        } else {
          setDetectedDropUp(false);
        }
      }
    }
  }, [open, placement, dropUp]);

  const isTop = dropUp || placement === 'top' || (placement !== 'bottom' && detectedDropUp);

  const selected = normalizedOptions.find((o) => o.value === value);

  const sizeClasses = {
    xs: 'px-2 py-1 text-[11px] min-h-[26px]',
    sm: 'px-2.5 py-1.5 text-xs min-h-[32px]',
    md: 'px-3 py-2 text-sm min-h-[38px]',
  }[size] || 'px-2.5 py-1.5 text-xs min-h-[32px]';

  const handleSelect = (optValue) => {
    if (onChange) {
      onChange({ target: { value: optValue, name } });
    }
    setOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={twMerge('relative inline-block text-left select-none', containerClassName)} ref={ref}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold text-slate-700 tracking-wide mb-1.5"
        >
          {label} {required && <span className="text-rose-500" aria-hidden="true">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={twMerge(
          'relative w-full flex items-center justify-between gap-2 rounded-lg border font-medium text-left',
          'transition-all duration-200 ease-out cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-emerald-500/20',
          sizeClasses,
          disabled
            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
            : open
            ? 'bg-white border-emerald-500 text-slate-900 shadow-md ring-2 ring-emerald-500/15'
            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/70 hover:shadow-xs',
          error ? 'border-rose-400 focus:ring-rose-500/20' : '',
          className,
          triggerClassName
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
          {IconComponent && (
            <IconComponent className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          )}

          {selected ? (
            <span className="flex items-center gap-1.5 truncate">
              {selected.dot && (
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0 shadow-2xs"
                  style={{ backgroundColor: selected.dot }}
                />
              )}
              {selected.icon && (
                <span className="flex-shrink-0">{selected.icon}</span>
              )}
              <span className="truncate font-semibold">{selected.label}</span>
            </span>
          ) : (
            <span className="text-slate-400 font-normal truncate">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={twMerge(
            'w-3.5 h-3.5 flex-shrink-0 text-slate-400 transition-transform duration-200 ease-out',
            open && 'rotate-180 text-emerald-600'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      <div
        className={twMerge(
          'absolute z-50 py-1.5',
          'bg-white/98 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xl shadow-slate-900/15 ring-1 ring-slate-950/5',
          'transition-all duration-150 ease-out',
          isTop ? 'bottom-full mb-1.5 origin-bottom' : 'top-full mt-1.5 origin-top',
          minWidth,
          'max-w-[calc(100vw-2.5rem)]',
          align === 'right' ? 'right-0' : 'left-0',
          open
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : isTop
            ? 'opacity-0 scale-95 translate-y-1.5 pointer-events-none'
            : 'opacity-0 scale-95 -translate-y-1.5 pointer-events-none',
          menuClassName
        )}
        role="listbox"
      >
        {/* Optional Search bar inside dropdown */}
        {searchable && (
          <div className="px-2 pt-1 pb-1.5 border-b border-slate-100">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search options..."
                className="w-full pl-7 pr-6 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-emerald-500 focus:bg-white text-slate-800"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-1.5 p-0.5 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Options list */}
        <div className="max-h-72 overflow-y-auto py-0.5 custom-scroll scrollbar-thin">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400 text-center italic">
              No matching options
            </div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isActive = opt.value === value;
              const isHighlighted = idx === highlightIndex;

              return (
                <button
                  key={`${opt.value}-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  disabled={opt.disabled}
                  onClick={() => !opt.disabled && handleSelect(opt.value)}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  className={twMerge(
                    'flex items-center justify-between gap-2 w-full px-2.5 py-1.5 text-xs text-left',
                    'transition-colors duration-100 cursor-pointer rounded-lg mx-auto my-0.5',
                    'max-w-[calc(100%-8px)]',
                    opt.disabled && 'opacity-40 cursor-not-allowed',
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-bold'
                      : isHighlighted
                      ? 'bg-slate-100 text-slate-900 font-medium'
                      : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100 font-medium'
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    {opt.dot && (
                      <span
                        className="inline-block w-2 h-2 rounded-full flex-shrink-0 shadow-2xs"
                        style={{ backgroundColor: opt.dot }}
                      />
                    )}
                    {opt.icon && (
                      <span className="flex-shrink-0">{opt.icon}</span>
                    )}
                    <span className="truncate">{opt.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {opt.badge && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded font-medium">
                        {opt.badge}
                      </span>
                    )}
                    {isActive && (
                      <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-1 text-xs text-rose-600 font-medium">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className="mt-1 text-xs text-slate-500 font-medium">
          {helperText}
        </p>
      )}
    </div>
  );
}

export default CustomSelect;
