import React from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Compass,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  HelpCircle,
  FileText
} from 'lucide-react';
import { formatErrorResolution, copyErrorDetailsToClipboard } from '../../utils/errorHandler.js';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CRM visual component crashed:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleCopy = async (resolution) => {
    const ok = await copyErrorDetailsToClipboard(resolution);
    if (ok) {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2200);
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleNavigate = (path) => {
    window.location.href = path;
  };

  handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/dashboard?tab=overview';
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error, errorInfo, showDetails, copied } = this.state;
    const resolution = formatErrorResolution(error, {
      isRenderError: true,
      title: 'This screen could not be loaded',
      message: error?.message || 'A visual component encountered an unexpected problem while rendering this page.',
      stack: errorInfo?.componentStack || error?.stack
    });

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans">
        <div
          role="alert"
          className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl text-slate-800"
        >
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                  Render Error
                </span>
                <span className="text-xs text-slate-500 font-medium">Shanthi Ayurvedas CRM</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                {resolution.title}
              </h1>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                {resolution.message}
              </p>
            </div>
          </div>

          {/* How to Solve Section */}
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-2.5">
              <HelpCircle className="w-4 h-4 text-amber-700" />
              <span>How to Solve This:</span>
            </div>
            <ol className="space-y-2 text-xs sm:text-sm text-amber-950">
              {resolution.howToSolve?.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Page Routing Links */}
          <div className="mt-6">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
              <Compass className="w-4 h-4 text-slate-600" />
              <span>Page Routing / Quick Navigation Links</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center justify-between p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold text-xs shadow-sm transition-all"
              >
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-700" />
                  Reload Page Now
                </span>
                <ArrowRight className="w-3.5 h-3.5 opacity-70" />
              </button>

              <button
                type="button"
                onClick={() => this.handleNavigate('/dashboard?tab=overview')}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all"
              >
                <span className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-slate-500" />
                  Go to Overview Dashboard
                </span>
                <ArrowRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                type="button"
                onClick={() => this.handleNavigate('/orders')}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  Go to Orders Management
                </span>
                <ArrowRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                type="button"
                onClick={() => this.handleNavigate('/leads')}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all"
              >
                <span className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-slate-500" />
                  Go to Leads Workspace
                </span>
                <ArrowRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            </div>
          </div>

          {/* Technical Details Accordion */}
          <div className="mt-6 border border-slate-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => this.setState({ showDetails: !showDetails })}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                Technical Error Details & Stack
              </span>
              {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showDetails && (
              <div className="p-4 bg-white border-t border-slate-200 text-xs space-y-3 font-mono">
                <div>
                  <span className="text-slate-500 font-semibold block mb-1">Error Message:</span>
                  <pre className="p-2.5 rounded-lg bg-rose-50 text-rose-900 border border-rose-200 overflow-x-auto text-[11px]">
                    {error?.toString() || 'Unknown rendering error'}
                  </pre>
                </div>

                {errorInfo?.componentStack && (
                  <div>
                    <span className="text-slate-500 font-semibold block mb-1">Component Stack:</span>
                    <pre className="p-2.5 rounded-lg bg-slate-100 text-slate-700 max-h-40 overflow-y-auto text-[10px]">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => this.handleCopy(resolution)}
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

          {/* Footer Actions */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={this.handleBack}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Go Back
            </button>

            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-5 py-2.5 font-semibold text-white text-xs shadow-md transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload Application
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
