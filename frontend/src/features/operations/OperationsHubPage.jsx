import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, Truck, CheckCircle2, RotateCcw, AlertTriangle, ArrowRight } from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { useBranch } from '../../context/BranchContext.jsx';
import { Card } from '../../components/common/Card.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';

export function OperationsHubPage() {
  const navigate = useNavigate();
  const { selectedBranchId } = useBranch();

  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['operationsSummary', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/operations/summary');
      return res.data?.data;
    }
  });

  if (isLoading) {
    return <Spinner size="lg" text="Loading operational queues..." className="py-24" />;
  }

  const s = summaryData || {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Operations & Fulfillment Hub</h2>
        <p className="text-xs text-slate-500">
          Streamlined assembly line from order verification, packing, courier dispatch, to RTO recovery
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Packing Station Card */}
        <Card className="p-5 flex flex-col justify-between hover:shadow-card transition-shadow">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Packing Station</h3>
            <p className="text-xs text-slate-500 mt-1">
              Verify items, record physical weight & corrugated box dimensions, generate tamper seal
            </p>
            <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
              <strong>{s.readyForPacking || 0} orders</strong> ready for packing
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100">
            <Button
              variant="primary"
              className="w-full"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => navigate('/operations/packing')}
            >
              Open Packing Station
            </Button>
          </div>
        </Card>

        {/* Dispatch Queue Card */}
        <Card className="p-5 flex flex-col justify-between hover:shadow-card transition-shadow">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center mb-3">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Courier Dispatch Queue</h3>
            <p className="text-xs text-slate-500 mt-1">
              Generate India Post / Professional Courier AWBs, print shipping labels, handover to courier vans
            </p>
            <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900">
              <strong>{s.packed || 0} packed parcels</strong> waiting for AWB & dispatch
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100">
            <Button
              variant="primary"
              className="w-full"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => navigate('/operations/dispatch')}
            >
              Open Dispatch Queue
            </Button>
          </div>
        </Card>

        {/* RTO Recovery Card */}
        <Card className="p-5 flex flex-col justify-between hover:shadow-card transition-shadow">
          <div>
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center mb-3">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">RTO Returns & Recovery</h3>
            <p className="text-xs text-slate-500 mt-1">
              Receive return parcels, verify medicine seal condition, and execute conditional inventory restock
            </p>
            <div className="mt-4 p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900">
              <strong>{s.rtoCount || 0} returned parcels</strong> in RTO pipeline
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100">
            <Button
              variant="primary"
              className="w-full"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => navigate('/rto')}
            >
              Manage RTO Returns
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default OperationsHubPage;
