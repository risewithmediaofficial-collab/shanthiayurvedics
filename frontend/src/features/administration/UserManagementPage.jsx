import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, UserCheck, Shield, Building, Mail, Phone, Lock } from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Table } from '../../components/common/Table.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Select } from '../../components/common/Select.jsx';

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'TELECALLER',
    branchId: ''
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await apiClient.get('/branches');
      return res.data?.data || res.data || [];
    }
  });

  const branchesList = Array.isArray(branchesData)
    ? branchesData
    : Array.isArray(branchesData?.data)
    ? branchesData.data
    : [];

  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await apiClient.get('/users');
      return res.data;
    }
  });

  const users = usersResponse?.data || [];

  const createUserMutation = useMutation({
    mutationFn: (data) =>
      apiClient.post('/users', {
        ...data,
        branches: data.branchId ? [data.branchId] : []
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setCreateModalOpen(false);
      setFormData({ name: '', email: '', phone: '', password: '', role: 'TELECALLER', branchId: '' });
    }
  });

  const columns = [
    {
      header: 'Staff Member',
      cell: (row) => (
        <div>
          <div className="font-bold text-slate-900 text-xs">{row.name}</div>
          <div className="text-[10px] text-slate-500 font-mono">{row.email}</div>
        </div>
      )
    },
    {
      header: 'Assigned Role',
      cell: (row) => {
        let variant = 'neutral';
        if (row.role === 'OWNER') variant = 'primary';
        if (row.role === 'DISTRIBUTOR') variant = 'purple';
        if (row.role === 'MANAGER') variant = 'warning';
        if (row.role === 'TELECALLER') variant = 'info';
        return <Badge variant={variant} size="sm">{row.role}</Badge>;
      }
    },
    {
      header: 'Primary Branch',
      cell: (row) => (
        <span className="text-xs text-slate-600">
          {row.branchId?.name || 'All Branches'}
        </span>
      )
    },
    {
      header: 'Status',
      align: 'right',
      cell: (row) => (
        <Badge variant={row.isActive ? 'emerald' : 'danger'} size="sm">
          {row.isActive ? 'Active' : 'Locked'}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Staff & User Management</h2>
          <p className="text-xs text-slate-500">Manage user accounts, roles, and branch assignment access controls</p>
        </div>
        <Button variant="primary" icon={UserPlus} onClick={() => setCreateModalOpen(true)}>
          Add Staff Member
        </Button>
      </div>

      <Table
        columns={columns}
        data={users}
        isLoading={isLoading}
        emptyMessage="No staff members registered."
      />

      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add Staff Member"
        subtitle="Generates Argon2id secured CRM account"
        maxWidth="max-w-md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createUserMutation.mutate(formData);
          }}
          className="space-y-3.5"
        >
          <Input
            label="Full Name *"
            required
            placeholder="e.g. Anand Sharma"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Input
            label="Staff Email *"
            type="email"
            required
            placeholder="anand@shanthiayurvedas.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Role *"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              options={[
                { value: 'OWNER', label: 'Owner (All Access)' },
                { value: 'DISTRIBUTOR', label: 'Distributor' },
                { value: 'MANAGER', label: 'Manager (Branch Operations)' },
                { value: 'TELECALLER', label: 'Telecaller' }
              ]}
            />

            <Select
              label="Assigned Branch *"
              value={formData.branchId}
              onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
              options={[
                { value: '', label: 'Select Branch...' },
                ...branchesList.map((b) => ({ value: b._id, label: `${b.name} (${b.code})` }))
              ]}
              required={formData.role !== 'OWNER'}
            />
          </div>

          <Input
            label="Initial Password *"
            type="password"
            required
            placeholder="Min 10 characters with symbols"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={createUserMutation.isPending}>
              Create Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default UserManagementPage;
