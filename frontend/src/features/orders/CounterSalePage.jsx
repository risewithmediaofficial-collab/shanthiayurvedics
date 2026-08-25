import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  ShoppingBag,
  Store,
  Printer,
  Receipt,
  Search,
  CheckCircle2,
  Calendar,
  CreditCard,
  DollarSign
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { useBranch } from '../../context/BranchContext.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';
import { OrderCreateModal } from './OrderCreateModal.jsx';
import { PrintableInvoiceModal } from './PrintableInvoiceModal.jsx';

export function CounterSalePage() {
  const { selectedBranchId, branches } = useBranch();
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(true);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);

  // Fetch recent counter orders
  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ['counterOrders', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/orders', { params: { limit: 25 } });
      return res.data;
    }
  });

  const orders = ordersResponse?.data || [];
  const currentBranch = branches?.find((b) => b._id === selectedBranchId) || { name: 'Hosur Main Branch' };

  // Calculate totals
  const totalSales = orders.reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);
  const codSales = orders.filter((o) => o.paymentMethod === 'COD').reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);
  const prepaidSales = orders.filter((o) => o.paymentMethod === 'PREPAID').reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center text-xl shadow-xs">
            🏪
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              Direct Counter & Office Walk-In POS
            </h2>
            <p className="text-xs text-slate-500">
              {currentBranch.name} • Instant Walk-In Invoicing & Cash/UPI Billing
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={() => setIsOrderModalOpen(true)}
          className="bg-purple-700 hover:bg-purple-800 text-white font-bold"
        >
          New Counter Invoice
        </Button>
      </div>

      {/* Counter Sales KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Counter Invoiced</div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 font-mono">
            ₹{totalSales.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{orders.length} transactions recorded</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Online / UPI Prepaid</div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1 font-mono">
            ₹{prepaidSales.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Instant settlement</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Cash / Counter COD</div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-1 font-mono">
            ₹{codSales.toLocaleString()}
          </div>
          <div className="text-[10px] text-amber-600 mt-0.5">Till register collection</div>
        </div>
      </div>

      {/* Recent Counter Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Recent Counter Receipts</h3>
          <span className="text-xs text-slate-400">{orders.length} total orders</span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center">
            <Spinner size="lg" text="Loading counter receipts..." />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <div className="text-3xl mb-2">🧾</div>
            <div className="text-sm font-semibold text-slate-800">No counter sales yet</div>
            <p className="text-xs text-slate-400 mt-1">Click "New Counter Invoice" to bill a walk-in patient.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {orders.map((ord) => {
              const pat = ord.patientDetails || {};
              return (
                <div key={ord._id} className="py-3 flex items-center justify-between flex-wrap gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm font-mono">{ord.orderNumber}</span>
                      <span className="text-slate-600 font-semibold">{pat.patientName || ord.customerId?.name || 'Walk-In Patient'}</span>
                      <Badge variant="primary" size="sm">{ord.paymentMethod}</Badge>
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      {ord.items?.map((i) => `${i.quantity}x ${i.productName}`).join(', ')} • {new Date(ord.createdAt).toLocaleDateString('en-GB')}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 font-mono text-sm">
                      ₹{ord.grandTotal?.toLocaleString()}
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedOrderForInvoice(ord)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Tax Invoice</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-over Order Creation Drawer */}
      {isOrderModalOpen && (
        <OrderCreateModal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
        />
      )}

      {/* Printable Invoice Modal */}
      {selectedOrderForInvoice && (
        <PrintableInvoiceModal
          isOpen={Boolean(selectedOrderForInvoice)}
          onClose={() => setSelectedOrderForInvoice(null)}
          order={selectedOrderForInvoice}
        />
      )}
    </div>
  );
}

export default CounterSalePage;
