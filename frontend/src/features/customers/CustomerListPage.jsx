import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  UserCheck,
  ShoppingBag,
  MapPin,
  Phone,
  MessageSquare,
  Download,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Table } from '../../components/common/Table.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Pagination } from '../../components/common/Pagination.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { OrderCreateModal } from '../orders/OrderCreateModal.jsx';
import { DateRangeFilter } from '../../components/common/DateRangeFilter.jsx';
import { ExportButton } from '../../components/common/ExportButton.jsx';
import { SortDropdown } from '../../components/common/SortDropdown.jsx';
import { exportToExcel, exportToCSV } from '../../utils/exportUtils.js';

const CUSTOMER_SORT_OPTIONS = [
  { value: 'createdAt', label: 'Registration Date' },
  { value: 'name', label: 'Customer Name' },
  { value: 'totalOrders', label: 'Total Orders' },
  { value: 'totalSpent', label: 'Lifetime Spent' },
  { value: 'mobile', label: 'Mobile Number' },
  { value: 'city', label: 'City / District' }
];

export function CustomerListPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isExporting, setIsExporting] = useState(false);
  const [customerForOrder, setCustomerForOrder] = useState(null);
  const [customerToEdit, setCustomerToEdit] = useState(null);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [actionMsg, setActionMsg] = useState('');

  const [editFormData, setEditFormData] = useState({
    name: '',
    mobile: '',
    altMobile: '',
    email: '',
    fatherName: '',
    street: '',
    landmark: '',
    city: '',
    state: 'Tamil Nadu',
    pincode: '',
    notes: ''
  });

  const { data: customerResponse, isLoading } = useQuery({
    queryKey: ['customers', page, search, startDate, endDate, sortBy, sortOrder],
    queryFn: async () => {
      const res = await apiClient.get('/customers', {
        params: {
          page,
          limit: 15,
          search,
          startDate,
          endDate,
          sortBy,
          sortOrder
        }
      });
      return res.data;
    }
  });

  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, payload }) => apiClient.patch(`/customers/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      setCustomerToEdit(null);
      setActionMsg('✓ Customer profile updated successfully');
      setTimeout(() => setActionMsg(''), 3000);
    },
    onError: (err) => {
      setActionMsg(`⚠ ${err.response?.data?.message || 'Failed to update customer'}`);
      setTimeout(() => setActionMsg(''), 4000);
    }
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      setCustomerToDelete(null);
      setActionMsg('✓ Customer removed successfully');
      setTimeout(() => setActionMsg(''), 3000);
    },
    onError: (err) => {
      setActionMsg(`⚠ ${err.response?.data?.message || 'Failed to remove customer'}`);
      setTimeout(() => setActionMsg(''), 4000);
    }
  });

  const customers = customerResponse?.data || [];
  const meta = customerResponse?.meta || { page: 1, totalPages: 1, total: 0 };

  const handleOpenWhatsApp = (customer) => {
    const cleanMobile = (customer.mobile || '').replace(/\D/g, '').slice(-10);
    if (!cleanMobile) return;
    const textMsg = encodeURIComponent(
      `🌿 *Shanthi Ayurvedas Wellness*\n\n` +
        `Hello *${customer.name}*,\n` +
        `Greeting from Shanthi Ayurvedas. We hope you are feeling well!\n\n` +
        `Would you like to re-order your Ayurvedic wellness medicines?\n\n` +
        `🙏 Shanthi Ayurvedas Healthcare Team`
    );
    window.open(`https://wa.me/91${cleanMobile}?text=${textMsg}`, '_blank');
  };

  const handleExportCustomers = async (format) => {
    try {
      setIsExporting(true);
      const res = await apiClient.get('/customers', {
        params: {
          search,
          startDate,
          endDate,
          sortBy,
          sortOrder,
          export: true
        }
      });
      const exportList = res.data?.data || customers;
      if (!exportList.length) {
        setActionMsg('⚠ No customer data to export');
        setTimeout(() => setActionMsg(''), 3000);
        return;
      }

      const rows = exportList.map((c) => {
        const addr = c.addresses?.[0] || {};
        return {
          'Customer Name': c.name || '',
          'Father / Spouse Name': c.fatherName || '',
          'Mobile': c.mobile || '',
          'Alt Mobile': c.altMobile || '',
          'Email': c.email || '',
          'Street Address': addr.street || '',
          'Landmark': addr.landmark || '',
          'City / District': addr.city || '',
          'State': addr.state || '',
          'Pincode': addr.pincode || '',
          'Branch': c.branchId?.name || '',
          'Assigned Telecaller': c.assignedTelecallerId?.name || '',
          'Total Orders': c.totalOrders || 0,
          'Lifetime Spent (₹)': c.totalSpent || 0,
          'Status': c.status || 'ACTIVE',
          'Registration Date': c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : ''
        };
      });

      const fileName = `Shanthi_Ayurvedas_Customers_${new Date().toISOString().split('T')[0]}`;
      if (format === 'csv') {
        exportToCSV(rows, fileName);
      } else {
        exportToExcel(rows, fileName, 'Customers');
      }
      setActionMsg(`✓ Exported ${rows.length} customers to ${format.toUpperCase()}`);
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      console.error('Customer export failed:', err);
      setActionMsg('⚠ Failed to export customers');
      setTimeout(() => setActionMsg(''), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const columns = [
    {
      header: 'Customer Details',
      cell: (row) => (
        <div>
          <div className="font-bold text-slate-900">{row.name}</div>
          <div className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
            <Phone className="w-3 h-3 text-slate-400" /> {row.mobile}
          </div>
        </div>
      )
    },
    {
      header: 'Primary Address',
      cell: (row) => {
        const addr = row.addresses?.[0];
        if (!addr) return <span className="text-slate-400 italic text-xs">No address</span>;
        return (
          <div className="text-xs text-slate-600 max-w-xs flex items-start gap-1">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
            <span>{addr.street ? `${addr.street}, ` : ''}{addr.city}, {addr.state} - {addr.pincode}</span>
          </div>
        );
      }
    },
    {
      header: 'Total Orders',
      cell: (row) => (
        <span className="font-semibold text-xs text-slate-800">
          {row.totalOrders || 0} orders
        </span>
      )
    },
    {
      header: 'Lifetime Spent',
      cell: (row) => (
        <span className="font-bold text-xs text-emerald-700">
          ₹{(row.totalSpent || 0).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Branch',
      cell: (row) => (
        <Badge variant="neutral" size="sm">
          {row.branchId?.name || 'Hosur'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenWhatsApp(row)}
            title="Chat on WhatsApp"
            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>

          <a
            href={`tel:${row.mobile}`}
            title="Call"
            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors flex items-center gap-1"
          >
            <Phone className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={() => setCustomerForOrder(row)}
            title="New Prescription Order"
            className="p-1.5 rounded-lg bg-ayur-50 hover:bg-ayur-100 text-ayur-800 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-ayur-700" />
            <span className="hidden lg:inline text-[11px]">Order</span>
          </button>

          {/* Edit Customer */}
          <button
            type="button"
            onClick={() => {
              const addr = row.addresses?.[0] || {};
              setCustomerToEdit(row);
              setEditFormData({
                name: row.name || '',
                mobile: row.mobile || '',
                altMobile: row.altMobile || '',
                email: row.email || '',
                fatherName: row.fatherName || '',
                street: addr.street || '',
                landmark: addr.landmark || '',
                city: addr.city || '',
                state: addr.state || 'Tamil Nadu',
                pincode: addr.pincode || '',
                notes: row.notes || ''
              });
            }}
            title="Edit Customer"
            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors flex items-center cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* Delete Customer */}
          <button
            type="button"
            onClick={() => setCustomerToDelete(row)}
            title="Delete Customer"
            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors flex items-center cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Customer Registry</h2>
          <p className="text-xs text-slate-500">Verified buyers converted from telecaller interactions</p>
        </div>
        <ExportButton
          onExport={handleExportCustomers}
          isLoading={isExporting}
          disabled={customers.length === 0}
        />
      </div>

      {/* Notification Toast */}
      {actionMsg && (
        <div className={`flex items-center gap-2 px-4 py-2.5 border text-sm font-semibold rounded-xl ${
          actionMsg.startsWith('⚠')
            ? 'bg-amber-50 border-amber-200 text-amber-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {actionMsg}
        </div>
      )}

      {/* Bento Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Verified Patients & Clients</div>
          <div className="bento-metric-value text-slate-900">{meta.total || customers.length}</div>
          <div className="text-[11px] text-slate-500 font-medium">Ayurvedic registry</div>
        </div>
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Repeat Buyers</div>
          <div className="bento-metric-value text-emerald-700">
            {customers.filter(c => (c.totalOrders || 0) > 1).length}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium">Multiple courses prescribed</div>
        </div>
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Lifetime Value (LTV)</div>
          <div className="bento-metric-value text-indigo-600">
            ₹{customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-indigo-600 font-medium">Cumulative patient revenue</div>
        </div>
      </div>

      {/* Unified Search, Date Range, and Sorting Controls */}
      <div className="bento-card p-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-4">
            <Input
              placeholder="Search by customer name, mobile, city..."
              icon={Search}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="lg:col-span-5">
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onChange={({ startDate: s, endDate: e }) => {
                setStartDate(s);
                setEndDate(e);
                setPage(1);
              }}
            />
          </div>
          <div className="lg:col-span-3 flex justify-end">
            <SortDropdown
              options={CUSTOMER_SORT_OPTIONS}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onChange={({ sortBy: sb, sortOrder: so }) => {
                setSortBy(sb);
                setSortOrder(so);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        data={customers}
        isLoading={isLoading}
        emptyMessage="No customers found."
      />

      <Pagination
        currentPage={page}
        totalPages={meta.totalPages}
        totalItems={meta.total}
        itemsPerPage={15}
        onPageChange={setPage}
      />

      {/* Order Creation for Customer */}
      {customerForOrder && (
        <OrderCreateModal
          isOpen={Boolean(customerForOrder)}
          onClose={() => setCustomerForOrder(null)}
          initialPatientData={{
            name: customerForOrder.name,
            mobile: customerForOrder.mobile,
            fatherName: customerForOrder.fatherName,
            altMobile: customerForOrder.altMobile,
            city: customerForOrder.addresses?.[0]?.city || '',
            state: customerForOrder.addresses?.[0]?.state || 'Tamil Nadu',
            pincode: customerForOrder.addresses?.[0]?.pincode || ''
          }}
        />
      )}

      {/* Edit Customer Modal */}
      {customerToEdit && (
        <Modal
          isOpen={Boolean(customerToEdit)}
          onClose={() => setCustomerToEdit(null)}
          title={`Edit Customer: ${customerToEdit.name}`}
          maxWidth="max-w-xl"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateCustomerMutation.mutate({
                id: customerToEdit._id,
                payload: {
                  name: editFormData.name.trim(),
                  mobile: editFormData.mobile.trim(),
                  altMobile: editFormData.altMobile?.trim(),
                  email: editFormData.email?.trim(),
                  fatherName: editFormData.fatherName?.trim(),
                  notes: editFormData.notes?.trim(),
                  addresses: [
                    {
                      street: editFormData.street?.trim(),
                      landmark: editFormData.landmark?.trim(),
                      city: editFormData.city?.trim() || 'Hosur',
                      state: editFormData.state || 'Tamil Nadu',
                      pincode: editFormData.pincode?.trim() || '635109'
                    }
                  ]
                }
              });
            }}
            className="space-y-3.5"
          >
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Customer Name *"
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
              <Input
                label="Father / Guardian Name"
                value={editFormData.fatherName}
                onChange={(e) => setEditFormData({ ...editFormData, fatherName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Primary Mobile *"
                required
                value={editFormData.mobile}
                onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
              />
              <Input
                label="Alternate Mobile"
                value={editFormData.altMobile}
                onChange={(e) => setEditFormData({ ...editFormData, altMobile: e.target.value })}
              />
            </div>
            <Input
              label="Email Address"
              type="email"
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
            />
            <Input
              label="Street Address"
              value={editFormData.street}
              onChange={(e) => setEditFormData({ ...editFormData, street: e.target.value })}
            />
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="City / Town"
                value={editFormData.city}
                onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
              />
              <Input
                label="State"
                value={editFormData.state}
                onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
              />
              <Input
                label="Pincode"
                value={editFormData.pincode}
                onChange={(e) => setEditFormData({ ...editFormData, pincode: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" type="button" onClick={() => setCustomerToEdit(null)} disabled={updateCustomerMutation.isPending}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={updateCustomerMutation.isPending}>
                Save Customer
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Customer Modal */}
      {customerToDelete && (
        <Modal
          isOpen={Boolean(customerToDelete)}
          onClose={() => setCustomerToDelete(null)}
          title="Delete Customer Confirmation"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-100 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-800">
                <p className="font-bold mb-1">Are you sure you want to delete this customer?</p>
                <p>
                  Customer <strong>{customerToDelete.name}</strong> ({customerToDelete.mobile}) will be permanently removed.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setCustomerToDelete(null)} disabled={deleteCustomerMutation.isPending}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteCustomerMutation.mutate(customerToDelete._id)}
                isLoading={deleteCustomerMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Customer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default CustomerListPage;
