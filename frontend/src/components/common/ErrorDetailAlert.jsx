import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  HelpCircle,
  Compass,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ShieldAlert,
  Info
} from 'lucide-react';
import { formatErrorResolution, copyErrorDetailsToClipboard } from '../../utils/errorHandler.js';

/**
 * Reusable inline error alert component.
 * Displays a clean, valid error message, actionable "how to solve" guidance,
 * expandable technical details with clipboard copy, and direct page routing links.
 *
 * @param {Object} props
 * @param {Error|Object|string} props.error The error to format and display
 * @param {string} [props.title] Custom title override
 * @param {string} [props.message] Custom message override
 * @param {Function} [props.onRetry] Optional retry callback
 * @param {string} [props.className] Additional CSS classes
 * @param {boolean} [props.defaultExpanded] Whether details are initially expanded
 */
export function ErrorDetailAlert({
  error,
  title,
  message,
  onRetry,
  className = '',
  defaultExpanded = false
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showTech, setShowTech] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!error) return null;

  const resolution = formatErrorResolution(error, { title, message });

  const handleCopy = async () => {
    const ok = await copyErrorDetailsToClipboard(resolution);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleNavigate = (link) => {
    if (link.isAction || link.path === '#reload') {
      window.location.reload();
      return;
    }
    navigate(link.path);
  };

  return (
    <div
      role="alert"
      className={`rounded-2xl border border-rose-200 bg-white shadow-sm overflow-hidden text-slate-800 transition-all ${className}`}
    >
      {/* Top Banner */}
      <div className="p-4 sm:p-5 flex items-start gap-3.5 bg-rose-50/50">
        <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0 mt-0.5">
          <AlertCircle className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-200 text-rose-900 uppercase">
              {typeof resolution.status === 'number' ? `HTTP ${resolution.status}` : resolution.status}
            </span>
            <h4 className="font-bold text-slate-900 text-sm">{resolution.title}</h4>
          </div>

          <p className="mt-1 text-xs sm:text-sm text-slate-700 leading-relaxed">
            {resolution.message}
          </p>

          {resolution.technical?.requestId && (
            <p className="mt-1 text-[11px] text-slate-400 font-mono">
              Reference: {resolution.technical.requestId}
            </p>
          )}

          {/* Quick Actions Bar */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-100/70 hover:bg-rose-100 text-rose-800 text-xs font-semibold transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              {expanded ? 'Hide Details & Solutions' : 'Show Details & How to Solve'}
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details & Solutions Section */}
      {expanded && (
        <div className="p-4 sm:p-5 border-t border-rose-100 space-y-4 bg-white animate-in fade-in duration-150">
          {/* How to Solve */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
            <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs sm:text-sm mb-2">
              <HelpCircle className="w-4 h-4 text-amber-700" />
              <span>How to Solve This:</span>
            </div>
            <ol className="space-y-1.5 text-xs text-amber-950">
              {resolution.howToSolve?.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px] flex items-center justify-center mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Page Routing Links */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              <Compass className="w-3.5 h-3.5 text-slate-600" />
              <span>Page Routing / Quick Navigation Links</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {resolution.routingLinks?.map((link, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleNavigate(link)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    link.primary
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    {link.isAction ? <RefreshCw className="w-3.5 h-3.5 shrink-0" /> : <Compass className="w-3.5 h-3.5 shrink-0" />}
                    <span className="truncate">{link.label}</span>
                  </span>
                  <ArrowRight className="w-3 h-3 opacity-60 shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>

          {/* Collapsible Technical Details */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTech(!showTech)}
              className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-500" />
                Technical Error Diagnostics
              </span>
              {showTech ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showTech && (
              <div className="p-3.5 bg-white border-t border-slate-200 text-xs font-mono space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-400">Status:</span>{' '}
                    <span className="font-semibold text-slate-800">{resolution.status}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Endpoint:</span>{' '}
                    <span className="font-semibold text-slate-800 truncate block">
                      {resolution.technical?.method} {resolution.technical?.endpoint || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Request ID:</span>{' '}
                    <span className="font-semibold text-slate-800">
                      {resolution.technical?.requestId || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Timestamp:</span>{' '}
                    <span className="font-semibold text-slate-800">
                      {resolution.technical?.timestamp}
                    </span>
                  </div>
                </div>

                {resolution.technical?.validationDetails && (
                  <div>
                    <span className="text-slate-500 font-semibold block mb-1">Validation Errors:</span>
                    <pre className="p-2 rounded bg-rose-50 text-rose-900 border border-rose-200 overflow-x-auto text-[11px]">
                      {JSON.stringify(resolution.technical.validationDetails, null, 2)}
                    </pre>
                  </div>
                )}

                {resolution.technical?.rawMessage && (
                  <div>
                    <span className="text-slate-500 font-semibold block mb-1">Raw Error:</span>
                    <pre className="p-2 rounded bg-slate-900 text-emerald-400 overflow-x-auto text-[11px]">
                      {resolution.technical.rawMessage}
                    </pre>
                  </div>
                )}

                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      copied ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Details
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ErrorDetailAlert;
