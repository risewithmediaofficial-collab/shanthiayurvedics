import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building, Plus, MapPin, Phone, Mail, CheckCircle2 } from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Table } from '../../components/common/Table.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Input } from '../../components/common/Input.jsx';

export function BranchManagementPage() {
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    phone: '',
    email: '',
    street: '',
    city: '',
    state: 'Tamil Nadu',
    pincode: ''
  });

  const { data: branchesResponse, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await apiClient.get('/branches');
      return res.data;
    }
  });

  const branches = branchesResponse?.data || [];

  const createMutation = useMutation({
    mutationFn: (data) =>
      apiClient.post('/branches', {
        name: data.name,
        code: data.code.toUpperCase(),
        phone: data.phone,
        email: data.email,
        address: {
          street: data.street,
          city: data.city,
          state: data.state,
          pincode: data.pincode
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['branches']);
      setCreateModalOpen(false);
      setFormData({ name: '', code: '', phone: '', email: '', street: '', city: '', state: 'Tamil Nadu', pincode: '' });
    }
  });

  const columns = [
    {
      header: 'Branch Name & Code',
      cell: (row) => (
        <div>
          <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
            <Building className="w-3.5 h-3.5 text-ayur-600" />
            {row.name}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Code: {row.code}</div>
        </div>
      )
    },
    {
      header: 'Contact',
      cell: (row) => (
        <div className="text-xs text-slate-600">
          <div>{row.phone || '—'}</div>
          <div className="text-[10px] text-slate-400">{row.email}</div>
        </div>
      )
    },
    {
      header: 'Location',
      cell: (row) => (
        <div className="text-xs text-slate-600">
          {row.address?.city}, {row.address?.state} - {row.address?.pincode}
        </div>
      )
    },
    {
      header: 'Status',
      align: 'right',
      cell: (row) => (
        <Badge variant={row.isActive ? 'emerald' : 'neutral'} size="sm">
          {row.isActive ? 'Active Branch' : 'Inactive'}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Physical Branch Locations</h2>
          <p className="text-xs text-slate-500">Configure multi-branch locations, warehouse codes, and address scopes</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setCreateModalOpen(true)}>
          Add New Branch
        </Button>
      </div>

      <Table
        columns={columns}
        data={branches}
        isLoading={isLoading}
        emptyMessage="No branches configured."
      />

      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add New Physical Branch"
        subtitle="Registers warehouse location and inventory ledger scope"
        maxWidth="max-w-md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(formData);
          }}
          className="space-y-3.5"
        >
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Branch Name *"
              required
              placeholder="e.g. Krishnagiri Branch"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label="Branch Code *"
              required
              placeholder="e.g. KGI"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              placeholder="Contact phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="Email"
              placeholder="branch@shanthiayurvedas.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <Input
            label="Street Address"
            placeholder="Main Road, Bazaar Street"
            value={formData.street}
            onChange={(e) => setFormData({ ...formData, street: e.target.value })}
          />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="City"
              placeholder="Krishnagiri"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <Input
              label="State"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
            <Input
              label="Pincode"
              placeholder="635001"
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={createMutation.isPending}>
              Create Branch
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default BranchManagementPage;
