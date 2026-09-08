import React from 'react';

/**
 * SimpleProgressBar
 * Minimalist, elegant layout bar for progress, targets, and multi-segment pipelines.
 */
export function SimpleProgressBar({
  value = 0,
  max = 100,
  label,
  sublabel,
  color = 'emerald', // emerald | blue | amber | purple | rose
  size = 'md', // sm (h-1.5) | md (h-2.5) | lg (h-4)
  showPercentage = true,
  className = ''
}) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100))) || 0;

  const colorStyles = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
    rose: 'bg-rose-500'
  };

  const heightStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5'
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="font-semibold text-slate-700">{label}</span>}
          <div className="flex items-center gap-1.5 ml-auto">
            {sublabel && <span className="text-slate-400 font-medium">{sublabel}</span>}
            {showPercentage && (
              <span className="font-bold text-slate-800 font-mono text-[11px]">
                {percentage}%
              </span>
            )}
          </div>
        </div>
      )}
      <div className={`progress-track ${heightStyles[size] || 'h-2.5'}`}>
        <div
          className={`progress-fill ${colorStyles[color] || 'bg-emerald-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * SimplePipelineTrack
 * Multi-segment horizontal distribution bar (e.g. Orders/Leads workflow breakdown).
 */
export function SimplePipelineTrack({ segments = [], total = 0, className = '' }) {
  const calculatedTotal = total || segments.reduce((acc, s) => acc + (s.count || 0), 0) || 1;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Multi-segment layout bar */}
      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/80 flex p-0.5 gap-0.5">
        {segments.map((seg, idx) => {
          const widthPct = Math.max(2, Math.round(((seg.count || 0) / calculatedTotal) * 100));
          return (
            <div
              key={seg.label || idx}
              title={`${seg.label}: ${seg.count} (${widthPct}%)`}
              className={`h-full rounded-sm transition-all duration-300 ${seg.bgColor || 'bg-slate-400'}`}
              style={{ width: `${widthPct}%` }}
            />
          );
        })}
      </div>

      {/* Segment Legend & Counts Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
        {segments.map((seg, idx) => (
          <div key={seg.label || idx} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${seg.indicatorColor || 'bg-slate-400'}`} />
            <span className="text-slate-500 font-medium text-[11px]">{seg.label}</span>
            <span className="font-bold text-slate-800 font-mono text-[11px]">
              {seg.count ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SimpleProgressBar;
