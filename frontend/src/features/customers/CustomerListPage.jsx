import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, UserCheck, ShoppingBag, MapPin, Phone } from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Table } from '../../components/common/Table.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Pagination } from '../../components/common/Pagination.jsx';
import { Badge } from '../../components/common/Badge.jsx';

export function CustomerListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data: customerResponse, isLoading } = useQuery({
    queryKey: ['customers', page, search],
    queryFn: async () => {
      const res = await apiClient.get('/customers', { params: { page, limit: 15, search } });
      return res.data;
    }
  });

  const customers = customerResponse?.data || [];
  const meta = customerResponse?.meta || { page: 1, totalPages: 1, total: 0 };

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
            <span>{addr.street}, {addr.city}, {addr.state} - {addr.pincode}</span>
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
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Customer Registry</h2>
        <p className="text-xs text-slate-500">Verified buyers converted from telecaller interactions</p>
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
    </div>
  );
}

export default CustomerListPage;
