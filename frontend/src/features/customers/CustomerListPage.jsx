import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  UserCheck,
  ShoppingBag,
  MapPin,
  Phone,
  MessageSquare,
  Download
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Table } from '../../components/common/Table.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Pagination } from '../../components/common/Pagination.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { OrderCreateModal } from '../orders/OrderCreateModal.jsx';

export function CustomerListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [customerForOrder, setCustomerForOrder] = useState(null);

  const { data: customerResponse, isLoading } = useQuery({
    queryKey: ['customers', page, search],
    queryFn: async () => {
      const res = await apiClient.get('/customers', { params: { page, limit: 15, search } });
      return res.data;
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
        `Would you like to re-order your Ayurvedic wellness medicines or book a follow-up doctor consultation?\n\n` +
        `🙏 Shanthi Ayurvedas Healthcare Team`
    );
    window.open(`https://wa.me/91${cleanMobile}?text=${textMsg}`, '_blank');
  };

  const handleExportCSV = () => {
    if (customers.length === 0) return;
    const headers = ['Customer Name', 'Mobile', 'City', 'State', 'Pincode', 'Total Orders', 'Total Spent (Rs)'];
    const rows = customers.map((c) => {
      const addr = c.addresses?.[0] || {};
      return [
        `"${c.name || ''}"`,
        `"${c.mobile || ''}"`,
        `"${addr.city || ''}"`,
        `"${addr.state || ''}"`,
        `"${addr.pincode || ''}"`,
        `"${c.totalOrders || 0}"`,
        `"${c.totalSpent || 0}"`
      ];
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `shanthi_customers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors flex items-center gap-1"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px]">WhatsApp</span>
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
            className="p-1.5 rounded-lg bg-ayur-50 hover:bg-ayur-100 text-ayur-800 text-xs font-semibold transition-colors flex items-center gap-1"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-ayur-700" />
            <span className="hidden lg:inline text-[11px]">New Order</span>
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
        <Button
          variant="secondary"
          icon={Download}
          onClick={handleExportCSV}
          disabled={customers.length === 0}
        >
          Export CSV
        </Button>
      </div>

      <div className="p-3 bg-white rounded-xl border border-slate-200">
        <Input
          placeholder="Search by customer name or mobile..."
          icon={Search}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
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
    </div>
  );
}

export default CustomerListPage;
