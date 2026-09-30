import React, { useEffect, useRef, useState } from 'react';
import { WifiOff, AlertCircle, X } from 'lucide-react';

export function AppFeedback() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);
  useEffect(() => {
    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);
    const onError = (event) => {
      setError(event.detail);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setError(null), 12000);
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
  }, []);
  if (!offline && !error) return null;
  return <div className="fixed bottom-4 inset-x-4 sm:left-auto sm:w-96 z-[200] space-y-2">
    {offline && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-lg flex gap-3"><WifiOff className="shrink-0 w-5 h-5" />You're offline. Reconnect before saving changes.</div>}
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-white p-4 shadow-lg flex gap-3">
      <AlertCircle className="shrink-0 w-5 h-5 text-red-600" />
      <div className="text-sm text-slate-800 flex-1">{error.message}{error.requestId && <p className="mt-1 text-xs text-slate-500 break-all">Reference: {error.requestId}</p>}</div>
      <button type="button" aria-label="Dismiss error" onClick={() => setError(null)} className="self-start p-1"><X size={16} /></button>
    </div>}
  </div>;
}
