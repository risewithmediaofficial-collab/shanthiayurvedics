import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  WifiOff,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Compass,
  HelpCircle,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import { formatErrorResolution, copyErrorDetailsToClipboard } from '../../utils/errorHandler.js';

export function AppFeedback() {
  const navigate = useNavigate();
  const [offline, setOffline] = useState(!navigator.onLine);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);
    const onError = (event) => {
      // Normalize raw event details through formatErrorResolution
      const detail = event.detail;
      const formatted = detail && detail.howToSolve ? detail : formatErrorResolution(detail);
      setError(formatted);
      setShowTechDetails(false);
      setCopied(false);
      clearTimeout(timerRef.current);
      // Auto-dismiss the toast banner after 16s unless modal is open
      timerRef.current = setTimeout(() => {
        if (!modalOpen) setError(null);
      }, 16000);
    };

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    window.addEventListener('crm:error', onError);

    return () => {
      clearTimeout(timerRef.current);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('crm:error', onError);
    };
  }, [modalOpen]);

  const handleDismiss = () => {
    clearTimeout(timerRef.current);
    setError(null);
    setModalOpen(false);
  };

  const handleOpenDetails = () => {
    clearTimeout(timerRef.current);
    setModalOpen(true);
  };

  const handleCopyDetails = async () => {
    if (!error) return;
    const ok = await copyErrorDetailsToClipboard(error);
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
    handleDismiss();
    navigate(link.path);
  };

  if (!offline && !error) return null;

  return (
    <>
      {/* Toast notifications container */}
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[420px] z-[200] space-y-3 pointer-events-none">
        {offline && (
          <div
            role="status"
            className="pointer-events-auto rounded-2xl border border-amber-300 bg-amber-50/95 backdrop-blur-md p-4 text-sm text-amber-950 shadow-xl flex items-start gap-3 transition-all"
          >
            <WifiOff className="shrink-0 w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900">Offline Mode</p>
              <p className="text-xs text-amber-800 mt-0.5">
                You are currently disconnected. Changes may not be saved until your network restores.
              </p>
            </div>
          </div>
        )}

        {error && !modalOpen && (
          <div
            role="alert"
            className="pointer-events-auto rounded-2xl border border-rose-200 bg-white/95 backdrop-blur-md p-4 shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-3"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600 shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 tracking-wide uppercase">
                    {typeof error.status === 'number' ? `Error ${error.status}` : error.status || 'Notice'}
                  </span>
                  <h4 className="font-semibold text-slate-900 text-sm truncate">{error.title}</h4>
                </div>

                <p className="mt-1 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {error.message}
                </p>

                {error.technical?.requestId && (
                  <p className="mt-1 text-[11px] text-slate-400 font-mono truncate">
                    Ref ID: {error.technical.requestId}
                  </p>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenDetails}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Show Details & How to Solve
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigate(error.routingLinks?.[0] || { path: '/dashboard?tab=overview' })}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1 transition-colors"
                  >
                    Quick Route <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                aria-label="Dismiss error notification"
                onClick={handleDismiss}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Error Details & Resolution Modal */}
      {modalOpen && error && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="error-modal-title"
            className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-rose-50 via-white to-amber-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-200 text-rose-900">
                      {typeof error.status === 'number' ? `HTTP ${error.status}` : error.status}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {error.technical?.timestamp ? new Date(error.technical.timestamp).toLocaleTimeString() : 'Just now'}
                    </span>
                  </div>
                  <h3 id="error-modal-title" className="text-base font-bold text-slate-900 mt-0.5 truncate">
                    {error.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-700">
              {/* Valid Error Message */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Error Message
                </label>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800 leading-relaxed">
                  {error.message}
                </div>
              </div>

              {/* Actionable How-to-Solve Section */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-2.5">
                  <HelpCircle className="w-4 h-4 text-amber-700" />
                  <span>How to Solve This:</span>
                </div>
                <ol className="space-y-2 text-xs sm:text-sm text-amber-950 font-normal">
                  {error.howToSolve?.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-200/80 text-amber-900 font-bold text-xs flex items-center justify-center mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Direct Page Routing Links */}
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  <Compass className="w-4 h-4 text-slate-600" />
                  <span>Page Routing / Quick Navigation Links</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {error.routingLinks?.map((link, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleNavigate(link)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all ${
                        link.primary
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {link.isAction ? <RefreshCw className="w-4 h-4" /> : <Compass className="w-4 h-4" />}
                        {link.label}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Technical Details Accordion */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowTechDetails(!showTechDetails)}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-500" />
                    Technical Details & Diagnostics
                  </span>
                  {showTechDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showTechDetails && (
                  <div className="p-4 bg-white border-t border-slate-200 text-xs space-y-3 font-mono">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-400">Status:</span>{' '}
                        <span className="font-semibold text-slate-800">
                          {error.status} ({error.technical?.statusText || 'N/A'})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Endpoint:</span>{' '}
                        <span className="font-semibold text-slate-800 truncate block">
                          {error.technical?.method} {error.technical?.endpoint || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Request ID:</span>{' '}
                        <span className="font-semibold text-slate-800">
                          {error.technical?.requestId || 'Not available'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Timestamp:</span>{' '}
                        <span className="font-semibold text-slate-800">
                          {error.technical?.timestamp}
                        </span>
                      </div>
                    </div>

                    {error.technical?.validationDetails && (
                      <div>
                        <span className="text-slate-500 font-semibold block mb-1">Validation Errors:</span>
                        <pre className="p-2.5 rounded-lg bg-rose-50 text-rose-900 border border-rose-200 overflow-x-auto text-[11px]">
                          {typeof error.technical.validationDetails === 'string'
                            ? error.technical.validationDetails
                            : JSON.stringify(error.technical.validationDetails, null, 2)}
                        </pre>
                      </div>
                    )}

                    {error.technical?.rawMessage && (
                      <div>
                        <span className="text-slate-500 font-semibold block mb-1">Raw Error:</span>
                        <pre className="p-2.5 rounded-lg bg-slate-900 text-emerald-400 overflow-x-auto text-[11px]">
                          {error.technical.rawMessage}
                        </pre>
                      </div>
                    )}

                    {error.technical?.stack && (
                      <div>
                        <span className="text-slate-500 font-semibold block mb-1">Stack Trace:</span>
                        <pre className="p-2.5 rounded-lg bg-slate-100 text-slate-700 max-h-36 overflow-y-auto text-[10px]">
                          {error.technical.stack}
                        </pre>
                      </div>
                    )}

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleCopyDetails}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          copied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-white hover:bg-slate-700'
                        }`}
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Copied to Clipboard!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy Error Details
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleCopyDetails}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied Details' : 'Copy Diagnostics'}
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate(error.routingLinks?.[0] || { path: '/dashboard?tab=overview' })}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 shadow-md transition-colors flex items-center gap-1.5"
                >
                  <span>{error.routingLinks?.[0]?.label || 'Go to Dashboard'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
export default AppFeedback;
