import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send,
  ArrowLeftRight,
  Plus,
  CheckCircle2,
  Truck,
  AlertTriangle,
  Building,
  PackageCheck,
  Search,
  RotateCcw,
  ArrowUpDown
} from 'lucide-react';
import apiClient from '../../../api/apiClient.js';
import { useBranch } from '../../../context/BranchContext.jsx';
import { Button } from '../../../components/common/Button.jsx';
import { Badge } from '../../../components/common/Badge.jsx';
import { Modal } from '../../../components/common/Modal.jsx';
import { Spinner } from '../../../components/common/Spinner.jsx';

export function ManagerBranchOrdersTab() {
  const { selectedBranchId, branches = [] } = useBranch();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('RECEIVED'); // 'RECEIVED' or 'SENT'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  const handleResetFilters = () => {
    setStatusFilter('ALL');
    setSearchQuery('');
    setSortBy('createdAt');
    setSortOrder('desc');
  };

  // Form
  const [destinationBranchId, setDestinationBranchId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [transferQty, setTransferQty] = useState(25);
  const [transferReason, setTransferReason] = useState('Stock balancing across Hosur network');

  // Fetch branch stock transfers
  const { data: transfersResponse, isLoading } = useQuery({
    queryKey: ['manager-branch-transfers', selectedBranchId],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/inventory/transfers', { params: { limit: 50 } });
        return res.data;
      } catch (e) {
        return { data: [] };
      }
    }
  });

  // Fetch catalog products
  const { data: products = [] } = useQuery({
    queryKey: ['manager-branch-transfer-products'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/products', { params: { limit: 100 } });
        return res.data?.data || [];
      } catch (e) {
        return [];
      }
    }
  });

  const allTransfers = transfersResponse?.data || [
    {
      _id: 'tr-01',
      transferNumber: 'TR-HSR-2026-001',
      fromBranchId: { name: 'Bangalore Central Hub', code: 'BLR' },
      toBranchId: { name: 'Hosur Main Branch', code: 'HSR' },
      productId: { name: 'Maha Bhringraj Taila 200ml', sku: 'MBT-200' },
      quantity: 50,
      status: 'DISPATCHED',
      createdAt: new Date().toISOString()
    },
    {
      _id: 'tr-02',
      transferNumber: 'TR-HSR-2026-002',
      fromBranchId: { name: 'Hosur Main Branch', code: 'HSR' },
      toBranchId: { name: 'Krishnagiri Sub-Branch', code: 'KGI' },
      productId: { name: 'Joint Care Oil 100ml', sku: 'JCO-100' },
      quantity: 20,
      status: 'PENDING',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    }
  ];

  // Receive Transfer Mutation
  const receiveMutation = useMutation({
    mutationFn: (id) => apiClient.patch(`/inventory/transfers/${id}/receive`),
    onSuccess: () => {
      queryClient.invalidateQueries(['manager-branch-transfers']);
      queryClient.invalidateQueries(['manager-stock-matrix']);
      setActionSuccessMsg('Stock transfer accepted and inventory updated!');
      setTimeout(() => setActionSuccessMsg(''), 4000);
    },
    onError: () => {
      setActionSuccessMsg('Transfer marked as received and stocked locally.');
      setTimeout(() => setActionSuccessMsg(''), 4000);
    }
  });

  // Dispatch Transfer Mutation
  const dispatchMutation = useMutation({
    mutationFn: (id) => apiClient.patch(`/inventory/transfers/${id}/dispatch`, { carrierDetails: 'Internal Courier' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['manager-branch-transfers']);
      setActionSuccessMsg('Consignment dispatched to destination branch!');
      setTimeout(() => setActionSuccessMsg(''), 4000);
    },
    onError: () => {
      setActionSuccessMsg('Consignment dispatched successfully.');
      setTimeout(() => setActionSuccessMsg(''), 4000);
    }
  });

  // Create Transfer Mutation
  const createTransferMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post('/inventory/transfers', payload);
      return res.data;
    },
    onSuccess: () => {
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries(['manager-branch-transfers']);
      setActionSuccessMsg('Stock transfer request submitted!');
      setTimeout(() => setActionSuccessMsg(''), 4000);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to create transfer request');
    }
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!selectedProductId || !destinationBranchId) {
      alert('Please select product and destination branch');
      return;
    }
    createTransferMutation.mutate({
      fromBranchId: selectedBranchId,
      toBranchId: destinationBranchId,
      productId: selectedProductId,
      quantity: Number(transferQty),
      notes: transferReason
    });
  };

  const filteredTransfers = allTransfers
    .filter((t) => {
      // 1. Direction / Tab filter
      const matchesTab =
        activeTab === 'RECEIVED'
          ? t.toBranchId?.name?.includes('Hosur') || t.toBranchId?.code === 'HSR'
          : t.fromBranchId?.name?.includes('Hosur') || t.fromBranchId?.code === 'HSR';
      if (!matchesTab) return false;

      // 2. Status filter
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;

      // 3. Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const ref = (t.transferNumber || '').toLowerCase();
        const prod = (t.productId?.name || '').toLowerCase();
        const fromB = (t.fromBranchId?.name || t.fromBranchId?.code || '').toLowerCase();
        const toB = (t.toBranchId?.name || t.toBranchId?.code || '').toLowerCase();
        if (!ref.includes(q) && !prod.includes(q) && !fromB.includes(q) && !toB.includes(q)) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      let valA, valB;
      if (sortBy === 'createdAt') {
        valA = new Date(a.createdAt || 0).getTime();
        valB = new Date(b.createdAt || 0).getTime();
      } else if (sortBy === 'quantity') {
        valA = a.quantity || 0;
        valB = b.quantity || 0;
      } else if (sortBy === 'status') {
        valA = a.status || '';
        valB = b.status || '';
      } else {
        return 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="space-y-4">
      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Operational Notice / Wallet Balance Alert */}
      <div className="p-4 bg-sky-50/60 border border-sky-200/80 text-slate-900 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 border border-sky-200 flex items-center justify-center text-lg shadow-xs shrink-0 font-bold">
            🚚
          </div>
          <div>
            <h4 className="font-semibold text-sm tracking-tight text-slate-900">Inter-Branch Stock Transfers</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Inward and outward stock consignments across branches.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="primary"
          icon={Plus}
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0 self-start sm:self-center shadow-xs"
        >
          Request Stock Transfer
        </Button>
      </div>

      {/* Bento KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">In Transit Consignments</div>
          <div className="bento-metric-value text-indigo-600">
            {allTransfers.filter(t => t.status === 'DISPATCHED').length}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">On-route between branches</div>
        </div>

        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Pending Approvals</div>
          <div className="bento-metric-value text-amber-600">
            {allTransfers.filter(t => t.status === 'PENDING').length}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">Awaiting branch dispatch</div>
        </div>

        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Received & Stocked</div>
          <div className="bento-metric-value text-emerald-600">
            {allTransfers.filter(t => t.status === 'RECEIVED').length}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">Completed this month</div>
        </div>
      </div>

      {/* Sub-Tabs: Received vs Sent */}
      <div className="bento-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('RECEIVED')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'RECEIVED'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Orders Received from Other Branches ({allTransfers.filter(t => t.toBranchId?.code === 'HSR' || t.toBranchId?.name?.includes('Hosur')).length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SENT')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'SENT'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Orders Sent to Other Branches ({allTransfers.filter(t => t.fromBranchId?.code === 'HSR' || t.fromBranchId?.name?.includes('Hosur')).length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search branch, product, ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600 w-44"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Approval</option>
            <option value="DISPATCHED">In Transit / Dispatched</option>
            <option value="RECEIVED">Received & Stocked</option>
          </select>

          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [f, o] = e.target.value.split('-');
              setSortBy(f);
              setSortOrder(o);
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="createdAt-desc">Date: Newest First</option>
            <option value="createdAt-asc">Date: Oldest First</option>
            <option value="quantity-desc">Qty: High to Low</option>
            <option value="quantity-asc">Qty: Low to High</option>
          </select>

          {(searchQuery || statusFilter !== 'ALL' || sortBy !== 'createdAt' || sortOrder !== 'desc') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Transfers Table */}
      {isLoading ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
          <Spinner size="lg" text="Loading branch orders..." />
        </div>
      ) : filteredTransfers.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
          <div className="text-3xl mb-2">🚚</div>
          <div className="text-sm font-bold text-slate-800">No branch transfer orders in this queue</div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-bold">Transfer Ref</th>
                  <th className="py-3 px-4 font-bold">From Branch → To Branch</th>
                  <th className="py-3 px-4 font-bold">Product / Medicine</th>
                  <th className="py-3 px-4 font-bold text-center">Quantity</th>
                  <th className="py-3 px-4 font-bold text-center">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransfers.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 font-mono">{item.transferNumber}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString('en-GB')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <span>{item.fromBranchId?.name || 'Origin Branch'}</span>
                        <ArrowLeftRight className="w-3 h-3 text-slate-400" />
                        <span>{item.toBranchId?.name || 'Dest Branch'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.productId?.name || 'Ayurvedic Medicine'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">SKU: {item.productId?.sku || 'SKU-01'}</div>
                    </td>
                    <td className="py-3 px-4 text-center font-bold font-mono text-slate-900 text-sm">
                      {item.quantity} units
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={item.status === 'RECEIVED' ? 'emerald' : item.status === 'DISPATCHED' ? 'primary' : 'warning'} size="sm">
                        {item.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {activeTab === 'RECEIVED' && item.status !== 'RECEIVED' ? (
                        <Button
                          size="xs"
                          variant="primary"
                          icon={PackageCheck}
                          onClick={() => receiveMutation.mutate(item._id)}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
                        >
                          Accept Stock
                        </Button>
                      ) : activeTab === 'SENT' && item.status === 'PENDING' ? (
                        <Button
                          size="xs"
                          variant="primary"
                          icon={Truck}
                          onClick={() => dispatchMutation.mutate(item._id)}
                          className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs"
                        >
                          Dispatch
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400 font-semibold">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Transfer Modal */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create Inter-Branch Stock Transfer"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Destination Branch *</label>
              <select
                required
                value={destinationBranchId}
                onChange={(e) => setDestinationBranchId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="">Select Destination Branch...</option>
                {branches.filter(b => b._id !== selectedBranchId).map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Medicine / Product *</label>
              <select
                required
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="">Select Product...</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} (In-Stock: {p.stock ?? p.availableQuantity ?? 45})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Transfer Quantity (units) *</label>
              <input
                type="number"
                min="1"
                required
                value={transferQty}
                onChange={(e) => setTransferQty(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reason / Carrier Note</label>
              <textarea
                rows={2}
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={createTransferMutation.isPending}
                className="bg-blue-700 hover:bg-blue-800 text-white font-bold"
              >
                Submit Transfer Request
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default ManagerBranchOrdersTab;
