import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserPlus, Building, Lock, RefreshCw, Power, Pencil, Phone, Mail, Trash2, AlertTriangle
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Table } from '../../components/common/Table.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Select } from '../../components/common/Select.jsx';

const ROLE_COLORS = {
  OWNER:       { variant: 'primary',  label: 'Admin / Owner' },
  MANAGER:     { variant: 'warning',  label: 'Manager' },
  DISTRIBUTOR: { variant: 'purple',   label: 'Distributor' },
  TELECALLER:  { variant: 'info',     label: 'Telecaller' }
};

const CREATABLE_ROLES = [
  { value: 'MANAGER',     label: 'Manager — Branch Operations' },
  { value: 'DISTRIBUTOR', label: 'Distributor — Regional Distribution' },
  { value: 'TELECALLER',  label: 'Telecaller — Leads and Sales Calls' }
];

const emptyForm = { name: '', email: '', phone: '', password: '', role: 'TELECALLER', branchId: '' };

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen]             = useState(false);
  const [editOpen, setEditOpen]                 = useState(false);
  const [resetOpen, setResetOpen]               = useState(false);
  const [statusToggleOpen, setStatusToggleOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser]         = useState(null);
  const [toast, setToast]                       = useState('');
  const [formData, setFormData]           = useState(emptyForm);
  const [editData, setEditData]           = useState({});
  const [newPassword, setNewPassword]     = useState('');

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  // Branches
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => { const res = await apiClient.get('/branches'); const _rd = res.data?.data; return Array.isArray(_rd) ? _rd : []; }
  });
  const branches = Array.isArray(branchesData) ? branchesData : [];

  // Users — filter out OWNER/Admin accounts (they manage the system, not "team")
  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => { const res = await apiClient.get('/users'); return res.data; }
  });
  const users = (usersResponse?.data || []).filter(u => u.role !== 'OWNER');

  // Create user
  const createMutation = useMutation({
    mutationFn: data => apiClient.post('/users', {
      ...data,
      branchId: data.branchId || null,
      branches: data.branchId ? [data.branchId] : (data.role === 'MANAGER' ? branches.map(b => b._id) : [])
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreateOpen(false);
      setFormData(emptyForm);
      showToast('Staff account created successfully');
    },
    onError: err => {
      const details = err.response?.data?.errors;
      const msg = Array.isArray(details) && details.length > 0
        ? details.map(d => (d.field ? d.field + ': ' : '') + (d.message || 'Invalid value')).join(' | ')
        : err.response?.data?.message || 'Failed to create account';
      showToast('Error: ' + msg);
    }
  });

  // Update user
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.patch(`/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditOpen(false);
      showToast('User updated successfully');
    },
    onError: err => showToast('Error: ' + (err.response?.data?.message || 'Update failed'))
  });

  // Toggle user status (Disable / Enable)
  const toggleMutation = useMutation({
    mutationFn: id => apiClient.patch(`/users/${id}/toggle-status`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-telecallers'] });
      queryClient.invalidateQueries({ queryKey: ['telecaller-users-list'] });
      setStatusToggleOpen(false);
      setSelectedUser(null);
      showToast('Account status updated');
    },
    onError: err => showToast('Error: ' + (err.response?.data?.message || 'Status toggle failed'))
  });

  // Permanently delete user
  const deleteMutation = useMutation({
    mutationFn: id => apiClient.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-telecallers'] });
      queryClient.invalidateQueries({ queryKey: ['telecaller-users-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteConfirmOpen(false);
      setSelectedUser(null);
      showToast('Staff account permanently deleted');
    },
    onError: err => showToast('Error: ' + (err.response?.data?.message || 'Failed to delete staff account'))
  });

  // Reset password
  const resetMutation = useMutation({
    mutationFn: ({ id, password }) => apiClient.post(`/users/${id}/reset-password`, { password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setResetOpen(false);
      setNewPassword('');
      showToast('Password reset successfully');
    },
    onError: err => showToast('Error: ' + (err.response?.data?.message || 'Password reset failed'))
  });

  const openEdit = (user) => {
    setSelectedUser(user);
    setEditData({
      name: user.name,
      phone: user.phone || '',
      role: user.role,
      branchId: user.branchId?._id || user.branchId || ''
    });
    setEditOpen(true);
  };

  const openReset = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setResetOpen(true);
  };

  const openDelete = (user) => {
    setSelectedUser(user);
    setDeleteOpen(true);
  };

  const columns = [
    {
      header: 'Staff Member',
      cell: row => (
        <div>
          <div className="font-semibold text-slate-900 text-xs">{row.name}</div>
          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
            <Mail className="w-2.5 h-2.5" />{row.email}
          </div>
          {row.phone && (
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <Phone className="w-2.5 h-2.5" />{row.phone}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Role',
      cell: row => {
        const meta = ROLE_COLORS[row.role] || { variant: 'neutral', label: row.role };
        return <Badge variant={meta.variant} size="sm">{meta.label}</Badge>;
      }
    },
    {
      header: 'Branch',
      cell: row => (
        <div className="flex items-center gap-1 text-xs text-slate-600">
          <Building className="w-3 h-3 text-slate-400" />
          {row.branchId?.name || (row.role === 'OWNER' ? 'All Branches' : 'Unassigned')}
        </div>
      )
    },
    {
      header: 'Status',
      cell: row => (
        <Badge variant={row.isActive ? 'emerald' : 'danger'} size="sm">
          {row.isActive ? 'Active' : 'Disabled'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      cell: row => {
        const isAdmin = row.role === 'OWNER';
        return (
          <div className="flex items-center gap-1.5 justify-end">
            {/* Edit — available for all users */}
            <button
              onClick={() => openEdit(row)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-700 border border-slate-200 hover:border-amber-200 transition-colors text-[11px] font-semibold cursor-pointer"
              title="Edit user"
            >
              <Pencil className="w-3 h-3" />
              <span>Edit</span>
            </button>

            {/* Reset Password — available for all users */}
            <button
              onClick={() => openReset(row)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition-colors text-[11px] font-semibold cursor-pointer"
              title="Reset password"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>

            {/* Disable/Enable — hidden for OWNER to prevent lockout */}
            {!isAdmin && (
              <button
                onClick={() => {
                  setSelectedUser(row);
                  setStatusToggleOpen(true);
                }}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border transition-colors text-[11px] font-semibold cursor-pointer ${
                  row.isActive
                    ? 'bg-amber-50/70 hover:bg-amber-100 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                }`}
                title={row.isActive ? 'Disable account' : 'Enable account'}
              >
                <Power className="w-3 h-3" />
                <span>{row.isActive ? 'Disable' : 'Enable'}</span>
              </button>
            )}

            {/* Delete Account — permanent deletion for non-owner staff */}
            {!isAdmin && (
              <button
                onClick={() => {
                  setSelectedUser(row);
                  setDeleteConfirmOpen(true);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 hover:border-rose-300 transition-colors text-[11px] font-semibold cursor-pointer shadow-2xs"
                title="Delete staff account permanently"
              >
                <Trash2 className="w-3 h-3 text-rose-600" />
                <span>Delete</span>
              </button>
            )}

            {/* Admin lock indicator */}
            {isAdmin && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] text-violet-500 bg-violet-50 border border-violet-100 rounded-lg font-semibold">
                <Lock className="w-3 h-3" />
                Admin
              </span>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Team Staff Management</h2>
          <p className="text-xs text-slate-500">Create and manage Manager, Distributor, and Telecaller accounts. Admin accounts are managed via your profile.</p>
        </div>
        <Button variant="primary" icon={UserPlus} onClick={() => { setFormData(emptyForm); setCreateOpen(true); }}>
          Add Staff Member
        </Button>
      </div>

      {/* Summary Badges */}
      <div className="flex flex-wrap gap-2">
        {['MANAGER','DISTRIBUTOR','TELECALLER'].map(role => {
          const count = users.filter(u => u.role === role).length;
          const meta = ROLE_COLORS[role];
          return (
            <div key={role} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
              <Badge variant={meta.variant} size="sm">{meta.label}</Badge>
              <span className="font-semibold text-slate-700">{count}</span>
              <span className="text-slate-400">account{count !== 1 ? 's' : ''}</span>
            </div>
          );
        })}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`px-4 py-2.5 border text-sm font-semibold rounded-xl ${toast.startsWith('Error') ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          {toast}
        </div>
      )}

      {/* Users Table */}
      <Table
        columns={columns}
        data={users}
        isLoading={isLoading}
        emptyMessage="No staff members registered. Create the first account using the button above."
      />

      {/* ── Create User Modal ── */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Staff Account"
        subtitle="Set up role-based login access for a staff member"
        maxWidth="max-w-md"
        icon="👤"
      >
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-3.5">
          <Input
            label="Full Name *"
            required
            placeholder="e.g. Anand Kumar"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Email Address *"
            type="email"
            required
            placeholder="anand@shanthiayurvedas.com"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Phone Number"
            type="tel"
            placeholder="+91 99999 99999"
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Role *"
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
              options={CREATABLE_ROLES}
            />
            <Select
              label="Assign Branch"
              value={formData.branchId}
              onChange={e => setFormData({ ...formData, branchId: e.target.value })}
              options={[
                { value: '', label: formData.role === 'MANAGER' ? '🏢 All Hubs (Multi-Branch)' : 'Select branch...' },
                ...branches.map(b => ({ value: b._id, label: `${b.name} (${b.code})` }))
              ]}
              required={formData.role !== 'OWNER' && formData.role !== 'MANAGER'}
            />
          </div>

          <div className="bg-slate-50 rounded-lg p-3 text-[11px] text-slate-500 space-y-1">
            {formData.role === 'MANAGER' && <p><span className="font-semibold text-amber-700">Manager:</span> Can manage branch orders, verify, pack, dispatch, handle leads and inventory.</p>}
            {formData.role === 'DISTRIBUTOR' && <p><span className="font-semibold text-blue-700">Distributor:</span> Can view/manage leads, customers, orders, inventory, and shipping for assigned region.</p>}
            {formData.role === 'TELECALLER' && <p><span className="font-semibold text-emerald-700">Telecaller:</span> Can create/manage leads, follow-ups, customers, and create orders.</p>}
          </div>

          <Input
            label="Initial Password *"
            type="password"
            required
            placeholder="Min 10 characters"
            minLength={10}
            value={formData.password}
            onChange={e => setFormData({ ...formData, password: e.target.value })}
          />
          <p className="text-[11px] text-slate-400 -mt-2">Use at least 10 characters with uppercase, lowercase, number, and special character.</p>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" isLoading={createMutation.isPending}>Create Account</Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit User Modal ── */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit: ${selectedUser?.name || ''}`}
        subtitle="Update name, role, phone, or branch assignment"
        maxWidth="max-w-md"
        icon="✏️"
      >
        <form
          onSubmit={e => {
            e.preventDefault();
            updateMutation.mutate({
              id: selectedUser._id,
              data: {
                name: editData.name,
                phone: editData.phone,
                role: editData.role,
                branchId: editData.branchId || null,
                branches: editData.branchId ? [editData.branchId] : (editData.role === 'MANAGER' ? branches.map(b => b._id) : [])
              }
            });
          }}
          className="space-y-3.5"
        >
          <Input
            label="Full Name"
            required
            value={editData.name || ''}
            onChange={e => setEditData({ ...editData, name: e.target.value })}
          />
          <Input
            label="Phone"
            value={editData.phone || ''}
            onChange={e => setEditData({ ...editData, phone: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Role"
              value={editData.role || 'TELECALLER'}
              onChange={e => setEditData({ ...editData, role: e.target.value })}
              options={CREATABLE_ROLES}
            />
            <Select
              label="Branch"
              value={editData.branchId || ''}
              onChange={e => setEditData({ ...editData, branchId: e.target.value })}
              options={[
                { value: '', label: editData.role === 'MANAGER' ? '🏢 All Hubs (Multi-Branch)' : 'No branch' },
                ...branches.map(b => ({ value: b._id, label: `${b.name} (${b.code})` }))
              ]}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" isLoading={updateMutation.isPending}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* ── Reset Password Modal ── */}
      <Modal
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        title={`Reset Password: ${selectedUser?.name || ''}`}
        subtitle="This will immediately log the user out of all devices"
        maxWidth="max-w-sm"
        icon="🔑"
      >
        <form
          onSubmit={e => {
            e.preventDefault();
            resetMutation.mutate({ id: selectedUser._id, password: newPassword });
          }}
          className="space-y-3.5"
        >
          <Input
            label="New Password *"
            type="password"
            required
            minLength={10}
            placeholder="Min 10 characters"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
          <p className="text-[11px] text-slate-400 -mt-2">User will be logged out of all devices on reset.</p>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button variant="danger" type="submit" icon={Lock} isLoading={resetMutation.isPending}>Reset Password</Button>
          </div>
        </form>
      </Modal>
      {/* ── Disable / Enable Confirm Modal ── */}
      <Modal
        isOpen={statusToggleOpen}
        onClose={() => setStatusToggleOpen(false)}
        title={selectedUser?.isActive ? 'Disable Account' : 'Enable Account'}
        maxWidth="max-w-sm"
        icon={selectedUser?.isActive ? '⚠️' : '✅'}
      >
        <div className="space-y-4">
          <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
            selectedUser?.isActive
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                {selectedUser?.isActive
                  ? `Disable ${selectedUser?.name}'s account?`
                  : `Re-enable ${selectedUser?.name}'s account?`}
              </p>
              <p className="text-xs mt-1 opacity-80">
                {selectedUser?.isActive
                  ? 'They will be immediately logged out of all devices and cannot log in until re-enabled.'
                  : 'Their login access will be restored immediately.'}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setStatusToggleOpen(false)}>Cancel</Button>
            <Button
              variant={selectedUser?.isActive ? 'danger' : 'success'}
              icon={Power}
              isLoading={toggleMutation.isPending}
              onClick={() => toggleMutation.mutate(selectedUser._id)}
            >
              {selectedUser?.isActive ? 'Yes, Disable Account' : 'Yes, Enable Account'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Permanent Delete Confirm Modal ── */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title={`Delete Account: ${selectedUser?.name || ''}`}
        maxWidth="max-w-md"
        icon="🗑️"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Are you sure you want to permanently delete this account?</p>
              <p className="text-xs text-rose-800">
                Staff member: <span className="font-semibold">{selectedUser?.name}</span> ({selectedUser?.email})
              </p>
              <p className="text-xs text-rose-700">
                Role: <span className="font-semibold">{selectedUser?.role}</span> • Branch: <span className="font-semibold">{selectedUser?.branchId?.name || 'Unassigned'}</span>
              </p>
              <p className="text-xs text-rose-600 pt-1">
                ⚠️ This action is irreversible. All active login sessions will be immediately terminated, and this staff record will be permanently removed from the system.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              isLoading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(selectedUser._id)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              Yes, Delete Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default UserManagementPage;
