import React, { useRef } from 'react';
import { Modal } from '../../../components/common/Modal.jsx';
import { Button } from '../../../components/common/Button.jsx';
import { Printer, Download, ExternalLink } from 'lucide-react';

export function TPCLabelModal({ isOpen, onClose, labelData, awbNumber }) {
  const iframeRef = useRef(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    } else if (labelData?.url) {
      window.open(labelData.url, '_blank');
    }
  };

  const isMock = labelData?.isMock !== false;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`The Professional Couriers — Consignment Label (${awbNumber || 'TPC'})`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Banner */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isMock
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}
            >
              {isMock ? 'MOCK / DEMO MODE' : 'LIVE TPC WEBSERVICE'}
            </span>
            <span className="text-slate-600 font-mono">AWB: <strong>{awbNumber}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            {labelData?.url && (
              <a
                href={labelData.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium underline"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open in TPC Portal
              </a>
            )}
            <Button
              variant="primary"
              size="sm"
              icon={Printer}
              onClick={handlePrint}
            >
              Print Label
            </Button>
          </div>
        </div>

        {/* Content iframe for HTML label */}
        <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-inner min-h-[480px]">
          {labelData?.html ? (
            <iframe
              ref={iframeRef}
              title="TPC Label Preview"
              srcDoc={labelData.html}
              className="w-full h-[520px] border-0"
            />
          ) : labelData?.url ? (
            <div className="p-8 text-center space-y-4">
              <p className="text-slate-600 text-sm">
                Official TPC Web Service label URL generated:
              </p>
              <a
                href={labelData.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow"
              >
                <ExternalLink className="w-4 h-4" /> Open Official TPC Label
              </a>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">No label preview content available</div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-between items-center pt-2">
          <span className="text-[11px] text-slate-500">
            {isMock ? 'Demo consignment note generated for verification.' : 'Official TPC consignment document.'}
          </span>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default TPCLabelModal;
