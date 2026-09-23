import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building,
  Plus,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  Pencil,
  Trash2,
  AlertTriangle,
  Users,
  ShieldCheck,
  UserCheck,
  UserX
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Table } from '../../components/common/Table.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Select } from '../../components/common/Select.jsx';

export function BranchManagementPage() {
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [selectedBranchForEdit, setSelectedBranchForEdit] = useState(null);
  const [selectedBranchForDelete, setSelectedBranchForDelete] = useState(null);
  const [actionMsg, setActionMsg] = useState('');

  const showToast = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 4000);
  };

  const initialFormState = {
    name: '',
    code: '',
    phone: '',
    email: '',
    street: '',
    city: '',
    state: 'Tamil Nadu',
    pincode: '',
    branchType: 'COMPANY_OWNED',
    managerId: '',
    managerName: '',
    managerPhone: '',
    distributorId: '',
    distributorName: '',
    distributorPhone: '',
    distributorEmail: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [editFormData, setEditFormData] = useState({
    ...initialFormState,
    isActive: true
  });

  // 1. Fetch Branches
  const { data: branchesResponse, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await apiClient.get('/branches');
      return res.data;
    }
  });
  const branches = branchesResponse?.data || [];

  // 2. Fetch Users to populate Manager and Distributor dropdowns
  const { data: usersResponse } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: async () => {
      const res = await apiClient.get('/users');
      return res.data;
    }
  });
  const allUsers = usersResponse?.data || [];
  const managers = allUsers.filter((u) => u.role === 'MANAGER');
  const distributors = allUsers.filter((u) => u.role === 'DISTRIBUTOR');

  // Handle Manager selection change in Create Form
  const handleManagerSelectCreate = (mgrId) => {
    const mgr = managers.find((m) => (m._id || m.id) === mgrId);
    setFormData((prev) => ({
      ...prev,
      managerId: mgrId,
      managerName: mgr ? mgr.name : '',
      managerPhone: mgr ? mgr.phone || '' : ''
    }));
  };

  // Handle Distributor selection change in Create Form
  const handleDistributorSelectCreate = (distId) => {
    const dist = distributors.find((d) => (d._id || d.id) === distId);
    setFormData((prev) => ({
      ...prev,
      distributorId: distId,
      distributorName: dist ? dist.name : '',
      distributorPhone: dist ? dist.phone || '' : '',
      distributorEmail: dist ? dist.email || '' : ''
    }));
  };

  // Handle Manager selection change in Edit Form
  const handleManagerSelectEdit = (mgrId) => {
    const mgr = managers.find((m) => (m._id || m.id) === mgrId);
    setEditFormData((prev) => ({
      ...prev,
      managerId: mgrId,
      managerName: mgr ? mgr.name : '',
      managerPhone: mgr ? mgr.phone || '' : ''
    }));
  };

  // Handle Distributor selection change in Edit Form
  const handleDistributorSelectEdit = (distId) => {
    const dist = distributors.find((d) => (d._id || d.id) === distId);
    setEditFormData((prev) => ({
      ...prev,
      distributorId: distId,
      distributorName: dist ? dist.name : '',
      distributorPhone: dist ? dist.phone || '' : '',
      distributorEmail: dist ? dist.email || '' : ''
    }));
  };

  const createMutation = useMutation({
    mutationFn: (data) =>
      apiClient.post('/branches', {
        name: data.name,
        code: data.code.toUpperCase(),
        phone: data.phone,
        email: data.email,
        branchType: data.branchType,
        managerId: data.managerId || null,
        managerName: data.managerName,
        managerPhone: data.managerPhone,
        distributorId: data.distributorId || null,
        distributorName: data.distributorName,
        distributorPhone: data.distributorPhone,
        distributorEmail: data.distributorEmail,
        address: {
          street: data.street,
          city: data.city,
          state: data.state,
          pincode: data.pincode
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['branches']);
      queryClient.invalidateQueries(['admin-users-list']);
      setCreateModalOpen(false);
      setFormData(initialFormState);
      showToast('✓ Branch created and assigned successfully');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to create branch');
    }
  });

  const editMutation = useMutation({
    mutationFn: (data) =>
      apiClient.patch(`/branches/${selectedBranchForEdit._id}`, {
        name: data.name,
        code: data.code.toUpperCase(),
        phone: data.phone,
        email: data.email,
        isActive: data.isActive,
        branchType: data.branchType,
        managerId: data.managerId || null,
        managerName: data.managerName,
        managerPhone: data.managerPhone,
        distributorId: data.distributorId || null,
        distributorName: data.distributorName,
        distributorPhone: data.distributorPhone,
        distributorEmail: data.distributorEmail,
        address: {
          street: data.street,
          city: data.city,
          state: data.state,
          pincode: data.pincode
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['branches']);
      queryClient.invalidateQueries(['admin-users-list']);
      setEditModalOpen(false);
      setSelectedBranchForEdit(null);
      showToast('✓ Branch and assignments updated successfully');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to update branch');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/branches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['branches']);
      queryClient.invalidateQueries(['admin-users-list']);
      setDeleteModalOpen(false);
      setSelectedBranchForDelete(null);
      showToast('✓ Branch deleted successfully');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to delete branch');
    }
  });

  const handleOpenEdit = (branch) => {
    setSelectedBranchForEdit(branch);
    setEditFormData({
      name: branch.name || '',
      code: branch.code || '',
      phone: branch.phone || '',
      email: branch.email || '',
      street: branch.address?.street || '',
      city: branch.address?.city || '',
      state: branch.address?.state || 'Tamil Nadu',
      pincode: branch.address?.pincode || '',
      branchType: branch.branchType || 'COMPANY_OWNED',
      managerId: branch.managerId?._id || branch.managerId || '',
      managerName: branch.managerName || branch.managerId?.name || '',
      managerPhone: branch.managerPhone || branch.managerId?.phone || '',
      distributorId: branch.distributorId?._id || branch.distributorId || '',
      distributorName: branch.distributorName || branch.distributorId?.name || '',
      distributorPhone: branch.distributorPhone || branch.distributorId?.phone || '',
      distributorEmail: branch.distributorEmail || branch.distributorId?.email || '',
      isActive: branch.isActive !== false
    });
    setEditModalOpen(true);
  };

  const columns = [
    {
      header: 'Branch & Code',
      cell: (row) => (
        <div>
          <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
            <Building className="w-3.5 h-3.5 text-emerald-600" />
            <span>{row.name}</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">{row.code}</span>
            <span className="text-slate-400 capitalize">({row.branchType === 'FRANCHISE' ? 'Franchise' : 'Company'})</span>
          </div>
        </div>
      )
    },
    {
      header: 'Assigned Distributor',
      cell: (row) => {
        const distName = row.distributorName || row.distributorId?.name;
        const distPhone = row.distributorPhone || row.distributorId?.phone;
        const distEmail = row.distributorEmail || row.distributorId?.email;

        if (!distName) {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
              <span>⚠️</span> Unassigned
            </span>
          );
        }

        return (
          <div className="text-xs">
            <div className="font-bold text-slate-900 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{distName}</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              {distPhone || distEmail || 'Distributor'}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Assigned Manager',
      cell: (row) => {
        const mgrName = row.managerName || row.managerId?.name;
        const mgrPhone = row.managerPhone || row.managerId?.phone;

        if (!mgrName) {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-medium">
              <UserX className="w-3 h-3 text-slate-400" /> None
            </span>
          );
        }

        return (
          <div className="text-xs">
            <div className="font-bold text-slate-900 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{mgrName}</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              {mgrPhone || 'Manager'}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Location & Phone',
      cell: (row) => (
        <div className="text-xs text-slate-600">
          <div>{row.address?.city || '—'}, {row.address?.state || ''}</div>
          <div className="text-[10px] text-slate-400 font-mono">{row.phone || 'No phone'}</div>
        </div>
      )
    },
    {
      header: 'Status',
      align: 'center',
      cell: (row) => (
        <Badge variant={row.isActive ? 'emerald' : 'neutral'} size="sm">
          {row.isActive ? 'Active' : 'Inactive'}
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
            title="Edit Branch & Assignments"
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-slate-200 hover:border-emerald-300 shadow-xs cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Delete Branch"
            onClick={() => {
              setSelectedBranchForDelete(row);
              setDeleteModalOpen(true);
            }}
            className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200 hover:border-rose-300 shadow-xs cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {actionMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {actionMsg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Enterprise Branch Management</h2>
          <p className="text-xs text-slate-500">
            Create multiple operating branches and assign a dedicated Distributor and Branch Manager to each.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setCreateModalOpen(true)}>
          Add New Branch
        </Button>
      </div>

      {/* Bento Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Operating Branches</div>
          <div className="bento-metric-value text-slate-900">{branches.length}</div>
          <div className="text-[11px] text-slate-500 font-medium">Physical dispensary hubs</div>
        </div>
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Assigned Distributors</div>
          <div className="bento-metric-value text-emerald-700">
            {branches.filter((b) => b.distributorId || b.distributorName).length}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium">Managing branch stocks</div>
        </div>
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Assigned Managers</div>
          <div className="bento-metric-value text-blue-700">
            {branches.filter((b) => b.managerId || b.managerName).length}
          </div>
          <div className="text-[11px] text-blue-600 font-medium">Managing branch orders & team</div>
        </div>
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Active Stations</div>
          <div className="bento-metric-value text-indigo-600">
            {branches.filter((b) => b.isActive).length}
          </div>
          <div className="text-[11px] text-indigo-600 font-medium">Live for booking & fulfillment</div>
        </div>
      </div>

      <Table
        columns={columns}
        data={branches}
        isLoading={isLoading}
        emptyMessage="No branches configured."
      />

      {/* ── CREATE BRANCH MODAL ── */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add Operating Branch & Assign Leadership"
        subtitle="Configure branch location and assign a Distributor and Branch Manager"
        maxWidth="max-w-lg"
        icon="🏢"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(formData);
          }}
          className="space-y-4"
        >
          {/* Section 1: Branch Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-1">
              1. Branch Identity
            </h4>
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
              <Select
                label="Branch Type"
                value={formData.branchType}
                onChange={(e) => setFormData({ ...formData, branchType: e.target.value })}
                options={[
                  { value: 'COMPANY_OWNED', label: 'Company Owned Branch' },
                  { value: 'FRANCHISE', label: 'Franchise Partner' }
                ]}
              />
              <Input
                label="Phone Number"
                placeholder="Branch phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          {/* Section 2: Leadership Assignment */}
          <div className="space-y-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <span>👑</span>
              <span>2. Assign Leadership (Distributor & Manager)</span>
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Select
                  label="Assigned Distributor (Stock Lead)"
                  value={formData.distributorId}
                  onChange={(e) => handleDistributorSelectCreate(e.target.value)}
                  options={[
                    { value: '', label: '— Select Distributor —' },
                    ...distributors.map((d) => ({
                      value: d._id || d.id,
                      label: `${d.name} (${d.phone || d.email})`
                    }))
                  ]}
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Responsible for branch stock levels & transfers
                </p>
              </div>

              <div>
                <Select
                  label="Assigned Manager (Operations Lead)"
                  value={formData.managerId}
                  onChange={(e) => handleManagerSelectCreate(e.target.value)}
                  options={[
                    { value: '', label: '— Select Manager —' },
                    ...managers.map((m) => ({
                      value: m._id || m.id,
                      label: `${m.name} (${m.phone || m.email})`
                    }))
                  ]}
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Responsible for orders, packing & team callers
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Physical Address */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-1">
              3. Physical Location
            </h4>
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
              <Select
                label="State"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                options={[
                  { value: 'Tamil Nadu', label: 'Tamil Nadu' },
                  { value: 'Karnataka', label: 'Karnataka' },
                  { value: 'Kerala', label: 'Kerala' },
                  { value: 'Andhra Pradesh', label: 'Andhra Pradesh' },
                  { value: 'Telangana', label: 'Telangana' },
                  { value: 'Maharashtra', label: 'Maharashtra' },
                  { value: 'Other', label: 'Other' }
                ]}
              />
              <Input
                label="Pincode"
                placeholder="635001"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={createMutation.isPending}>
              Create & Assign Branch
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── EDIT BRANCH MODAL ── */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Branch & Leadership Assignments"
        subtitle={`Update details and reassign leadership for ${selectedBranchForEdit?.name || 'Branch'}`}
        maxWidth="max-w-lg"
        icon="✏️"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            editMutation.mutate(editFormData);
          }}
          className="space-y-4"
        >
          {/* Section 1: Branch Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-1">
              1. Branch Identity
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Branch Name *"
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
              <Input
                label="Branch Code *"
                required
                value={editFormData.code}
                onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Branch Type"
                value={editFormData.branchType}
                onChange={(e) => setEditFormData({ ...editFormData, branchType: e.target.value })}
                options={[
                  { value: 'COMPANY_OWNED', label: 'Company Owned Branch' },
                  { value: 'FRANCHISE', label: 'Franchise Partner' }
                ]}
              />
              <Input
                label="Phone Number"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
              />
            </div>
          </div>

          {/* Section 2: Leadership Assignment */}
          <div className="space-y-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <span>👑</span>
              <span>2. Assigned Leadership</span>
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Select
                  label="Assigned Distributor"
                  value={editFormData.distributorId}
                  onChange={(e) => handleDistributorSelectEdit(e.target.value)}
                  options={[
                    { value: '', label: '— Select Distributor —' },
                    ...distributors.map((d) => ({
                      value: d._id || d.id,
                      label: `${d.name} (${d.phone || d.email})`
                    }))
                  ]}
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Responsible for branch stock levels & transfers
                </p>
              </div>

              <div>
                <Select
                  label="Assigned Manager"
                  value={editFormData.managerId}
                  onChange={(e) => handleManagerSelectEdit(e.target.value)}
                  options={[
                    { value: '', label: '— Select Manager —' },
                    ...managers.map((m) => ({
                      value: m._id || m.id,
                      label: `${m.name} (${m.phone || m.email})`
                    }))
                  ]}
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Responsible for orders, packing & team callers
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Physical Address */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-1">
              3. Physical Location
            </h4>
            <Input
              label="Street Address"
              value={editFormData.street}
              onChange={(e) => setEditFormData({ ...editFormData, street: e.target.value })}
            />
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="City"
                value={editFormData.city}
                onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
              />
              <Select
                label="State"
                value={editFormData.state}
                onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                options={[
                  { value: 'Tamil Nadu', label: 'Tamil Nadu' },
                  { value: 'Karnataka', label: 'Karnataka' },
                  { value: 'Kerala', label: 'Kerala' },
                  { value: 'Andhra Pradesh', label: 'Andhra Pradesh' },
                  { value: 'Telangana', label: 'Telangana' },
                  { value: 'Maharashtra', label: 'Maharashtra' },
                  { value: 'Other', label: 'Other' }
                ]}
              />
              <Input
                label="Pincode"
                value={editFormData.pincode}
                onChange={(e) => setEditFormData({ ...editFormData, pincode: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
            <input
              type="checkbox"
              id="branch-active-toggle"
              checked={editFormData.isActive}
              onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="branch-active-toggle" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Branch Active Status (Enabled for order routing & stock)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={editMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── DELETE BRANCH CONFIRMATION MODAL ── */}
      {deleteModalOpen && selectedBranchForDelete && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Branch Location"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">Are you sure you want to delete this branch?</p>
                <p>
                  Branch: <strong className="font-mono text-slate-900">{selectedBranchForDelete.name} ({selectedBranchForDelete.code})</strong>
                </p>
                <p className="text-slate-600">
                  This action will permanently delete the branch record and unbind associated assignments.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" type="button" onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                type="button"
                isLoading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(selectedBranchForDelete._id)}
              >
                Delete Branch
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default BranchManagementPage;
