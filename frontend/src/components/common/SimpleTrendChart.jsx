import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

/**
 * Custom Minimalist Tooltip
 */
function MinimalTooltip({ active, payload, label, prefix = '', suffix = '' }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 backdrop-blur-xs text-white px-3 py-2 rounded-xl shadow-lg border border-slate-700/50 text-xs">
        <p className="text-[11px] text-slate-300 font-medium">{label}</p>
        <p className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
          {prefix}{Number(payload[0].value).toLocaleString()}{suffix}
        </p>
      </div>
    );
  }
  return null;
}

/**
 * SimpleTrendChart
 * Lightweight, minimalist area or bar chart designed for instant comprehension.
 */
export function SimpleTrendChart({
  data = [],
  dataKey = 'value',
  xAxisKey = 'label',
  type = 'area', // 'area' | 'bar'
  height = 180,
  strokeColor = '#059669', // Emerald 600
  fillColor = '#10b981', // Emerald 500
  gradientId = 'chartGradient',
  prefix = '',
  suffix = '',
  showGrid = true,
  className = ''
}) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center bg-slate-50/50 border border-slate-200/60 rounded-2xl text-xs text-slate-400"
      >
        No trend data available for this range
      </div>
    );
  }

  return (
    <div style={{ height, width: '100%' }} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        {type === 'bar' ? (
          <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />}
            <XAxis
              dataKey={xAxisKey}
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
            />
            <Tooltip
              content={<MinimalTooltip prefix={prefix} suffix={suffix} />}
              cursor={{ fill: '#f8fafc' }}
            />
            <Bar dataKey={dataKey} fill={fillColor} radius={[6, 6, 0, 0]} maxBarSize={36} />
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={fillColor} stopOpacity={0.22} />
                <stop offset="95%" stopColor={fillColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />}
            <XAxis
              dataKey={xAxisKey}
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
            />
            <Tooltip
              content={<MinimalTooltip prefix={prefix} suffix={suffix} />}
              cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={strokeColor}
              strokeWidth={2.2}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export default SimpleTrendChart;
