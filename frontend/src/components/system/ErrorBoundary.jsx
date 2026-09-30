import React from 'react';

export class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error) { console.error('CRM screen failed:', error); }
  render() {
    if (this.state.hasError) return <div role="alert" className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 my-12 text-center shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">This screen could not be loaded</h1>
      <p className="mt-3 text-sm text-slate-600">Reload the application to reconnect. Any unsaved form entries will be cleared.</p>
      <button type="button" className="mt-6 rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white" onClick={() => window.location.reload()}>Reload application</button>
    </div>;
    return this.props.children;
  }
}
