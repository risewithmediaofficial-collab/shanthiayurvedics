import React, { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';

/**
 * Reusable Export Dropdown Button for Excel and CSV
 * @param {Function} onExport - (format: 'excel' | 'csv') => void
 * @param {boolean} disabled - Whether the button is disabled
 * @param {string} label - Button label (default: 'Export')
 */
export function ExportButton({
  onExport,
  disabled = false,
  label = 'Export'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (format) => {
    setIsOpen(false);
    onExport(format);
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs transition-all cursor-pointer disabled:opacity-50 select-none"
        title="Export data to Excel or CSV"
      >
        <Download className="w-3.5 h-3.5 text-emerald-600" />
        <span>{label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-30 animate-in fade-in duration-150">
          <button
            type="button"
            onClick={() => handleSelect('excel')}
            className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <div>
              <div className="font-bold">Excel (.xlsx)</div>
              <div className="text-[10px] text-slate-400 font-normal">Formatted spreadsheet</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelect('csv')}
            className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-800 flex items-center gap-2 cursor-pointer transition-colors border-t border-slate-100"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <div>
              <div className="font-bold">CSV (.csv)</div>
              <div className="text-[10px] text-slate-400 font-normal">Raw comma-separated</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

export default ExportButton;
