import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserPlus, Building, Lock, RefreshCw, Power, Pencil, Phone, Mail, Trash2, AlertTriangle,
  Search, Filter, X, RotateCcw, Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useBranch } from '../../context/BranchContext.jsx';
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
  const { user: currentUser } = useAuth();
  const isOwner = currentUser?.role === 'OWNER';
  const isManager = currentUser?.role === 'MANAGER';
  const { availableBranches = [] } = useBranch();
  const managerBranchId = String(currentUser?.branchId?._id || currentUser?.branchId || availableBranches[0]?._id || availableBranches[0]?.id || '');

  const [createOpen, setCreateOpen]             = useState(false);
  const [editOpen, setEditOpen]                 = useState(false);
  const [resetOpen, setResetOpen]               = useState(false);
  const [statusToggleOpen, setStatusToggleOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser]         = useState(null);
  const [toast, setToast]                       = useState('');
  const [formData, setFormData]           = useState(() => ({
    ...emptyForm,
    branchId: !isOwner ? managerBranchId : ''
  }));
  const [editData, setEditData]           = useState({});
  const [newPassword, setNewPassword]     = useState('');

  // ── Branch & Role Filters State ──
  const [selectedBranchFilter, setSelectedBranchFilter] = useState(!isOwner ? managerBranchId : 'ALL');
  const [selectedRoleFilter, setSelectedRoleFilter]     = useState('ALL');
  const [searchQuery, setSearchQuery]                   = useState('');
  const [statusFilter, setStatusFilter]                 = useState('ALL');

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
    queryFn: async () => { const res = await apiClient.get('/users?limit=500'); return res.data; }
  });
  const rawUsers = (usersResponse?.data || []).filter(u => u.role !== 'OWNER');

  // For Manager & non-owners, strictly filter out users belonging to other branches!
  const users = useMemo(() => {
    if (isOwner) return rawUsers;
    return rawUsers.filter(u => {
      const uBranchId = String(u.branchId?._id || u.branchId || '');
      const inBranches = Array.isArray(u.branches) && u.branches.some(b => String(b._id || b) === managerBranchId);
      return uBranchId === managerBranchId || inBranches;
    });
  }, [rawUsers, isOwner, managerBranchId]);

  // Branch counts map
  const branchCounts = useMemo(() => {
    const counts = { ALL: users.length, UNASSIGNED: 0 };
    branches.forEach(b => {
      counts[String(b._id)] = 0;
    });

    users.forEach(u => {
      const bId = u.branchId?._id || u.branchId;
      if (bId && counts[String(bId)] !== undefined) {
        counts[String(bId)]++;
      } else if (Array.isArray(u.branches) && u.branches.length > 0) {
        let matched = false;
        u.branches.forEach(b => {
          const id = String(b._id || b);
          if (counts[id] !== undefined) {
            counts[id]++;
            matched = true;
          }
        });
        if (!matched) counts.UNASSIGNED++;
      } else {
        counts.UNASSIGNED++;
      }
    });

    return counts;
  }, [users, branches]);

  // Filtered Users list based on branch, role, status and search
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // 1. Branch filter
      if (selectedBranchFilter !== 'ALL') {
        if (selectedBranchFilter === 'UNASSIGNED') {
          const hasBranchId = Boolean(user.branchId?._id || user.branchId);
          const hasBranches = Array.isArray(user.branches) && user.branches.length > 0;
          if (hasBranchId || hasBranches) return false;
        } else {
          const targetId = String(selectedBranchFilter);
          const directId = String(user.branchId?._id || user.branchId || '');
          const inArray = Array.isArray(user.branches) && user.branches.some(b => String(b._id || b) === targetId);
          if (directId !== targetId && !inArray) {
            return false;
          }
        }
      }

      // 2. Role filter
      if (selectedRoleFilter !== 'ALL') {
        if (user.role !== selectedRoleFilter) return false;
      }

      // 3. Status filter
      if (statusFilter === 'ACTIVE' && !user.isActive) return false;
      if (statusFilter === 'DISABLED' && user.isActive) return false;

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = user.name?.toLowerCase().includes(q);
        const matchEmail = user.email?.toLowerCase().includes(q);
        const matchPhone = user.phone?.toLowerCase().includes(q);
        const branchName = (user.branchId?.name || '').toLowerCase();
        if (!matchName && !matchEmail && !matchPhone && !branchName.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [users, selectedBranchFilter, selectedRoleFilter, statusFilter, searchQuery]);

  const hasActiveFilters = selectedBranchFilter !== 'ALL' || selectedRoleFilter !== 'ALL' || Boolean(searchQuery.trim()) || statusFilter !== 'ALL';

  const resetFilters = () => {
    setSelectedBranchFilter('ALL');
    setSelectedRoleFilter('ALL');
    setSearchQuery('');
    setStatusFilter('ALL');
  };

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
      branchId: !isOwner ? managerBranchId : (user.branchId?._id || user.branchId || '')
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
      className: 'min-w-[220px]',
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
      className: 'min-w-[130px]',
      cell: row => {
        const meta = ROLE_COLORS[row.role] || { variant: 'neutral', label: row.role };
        return <Badge variant={meta.variant} size="sm">{meta.label}</Badge>;
      }
    },
    {
      header: 'Branch',
      className: 'min-w-[220px]',
      cell: row => {
        const branchObj = row.branchId?.name
          ? row.branchId
          : branches.find(b => String(b._id) === String(row.branchId?._id || row.branchId));
        const branchName = branchObj?.name;
        const branchId = branchObj?._id || row.branchId?._id || row.branchId;

        if (branchName) {
          if (!isOwner) {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Building className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{branchName}</span>
              </span>
            );
          }

          const isCurrentFilter = String(selectedBranchFilter) === String(branchId);
          return (
            <button
              type="button"
              onClick={() => setSelectedBranchFilter(isCurrentFilter ? 'ALL' : String(branchId))}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                isCurrentFilter
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300 ring-2 ring-emerald-500/20'
                  : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border-slate-200 hover:border-emerald-200'
              }`}
              title={`Click to filter team by ${branchName}`}
            >
              <Building className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{branchName}</span>
            </button>
          );
        }

        if (row.role === 'MANAGER' && (!row.branchId || (Array.isArray(row.branches) && row.branches.length > 1))) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Building className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              All Hubs (Multi-Branch)
            </span>
          );
        }

        const isUnassignedActive = selectedBranchFilter === 'UNASSIGNED';
        return (
          <button
            type="button"
            disabled={!isOwner}
            onClick={() => setSelectedBranchFilter(isUnassignedActive ? 'ALL' : 'UNASSIGNED')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
              isUnassignedActive
                ? 'bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-500/20'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
            } ${!isOwner ? 'cursor-default' : 'cursor-pointer'}`}
            title="Unassigned staff"
          >
            <span>Unassigned</span>
          </button>
        );
      }
    },
    {
      header: 'Status',
      className: 'min-w-[110px]',
      cell: row => (
        <Badge variant={row.isActive ? 'emerald' : 'danger'} size="sm">
          {row.isActive ? 'Active' : 'Disabled'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      className: 'min-w-[320px] text-right whitespace-nowrap',
      cell: row => {
        const isAdmin = row.role === 'OWNER';
        return (
          <div className="flex items-center gap-1.5 justify-end whitespace-nowrap">
            {/* Edit — available for all users */}
            <button
              onClick={() => openEdit(row)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-700 border border-slate-200 hover:border-amber-200 transition-colors text-[11px] font-semibold cursor-pointer shrink-0"
              title="Edit user"
            >
              <Pencil className="w-3 h-3" />
              <span>Edit</span>
            </button>

            {/* Reset Password — available for all users */}
            <button
              onClick={() => openReset(row)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition-colors text-[11px] font-semibold cursor-pointer shrink-0"
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
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border transition-colors text-[11px] font-semibold cursor-pointer shrink-0 ${
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
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 hover:border-rose-300 transition-colors text-[11px] font-semibold cursor-pointer shadow-2xs shrink-0"
                title="Delete staff account permanently"
              >
                <Trash2 className="w-3 h-3 text-rose-600" />
                <span>Delete</span>
              </button>
            )}

            {/* Admin lock indicator */}
            {isAdmin && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] text-violet-500 bg-violet-50 border border-violet-100 rounded-lg font-semibold shrink-0">
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

      {/* Role Summary & Quick Filter Badges */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
        <button
          type="button"
          onClick={() => setSelectedRoleFilter('ALL')}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer border shrink-0 ${
            selectedRoleFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>All Staff</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            selectedRoleFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {users.length}
          </span>
        </button>

        {['MANAGER','DISTRIBUTOR','TELECALLER'].map(role => {
          const count = users.filter(u => u.role === role).length;
          const meta = ROLE_COLORS[role];
          const isSelected = selectedRoleFilter === role;
          return (
            <button
              key={role}
              type="button"
              onClick={() => setSelectedRoleFilter(prev => prev === role ? 'ALL' : role)}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer border shrink-0 ${
                isSelected
                  ? 'bg-white ring-2 ring-emerald-500/30 border-emerald-500 shadow-2xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
              title={`Click to filter by ${meta.label}`}
            >
              <Badge variant={meta.variant} size="sm">{meta.label}</Badge>
              <span className="font-bold text-slate-800">{count}</span>
              <span className="text-slate-400 text-[11px]">account{count !== 1 ? 's' : ''}</span>
              {isSelected && <span className="text-[10px] text-emerald-600 font-bold ml-0.5">● Active</span>}
            </button>
          );
        })}
      </div>

      {/* ── Branch-wise Filter & Search Control Panel ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
        {/* If non-owner (Manager), show their assigned branch banner */}
        {!isOwner && (
          <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800">
            <Building className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Your Assigned Branch: <strong className="text-emerald-950 font-bold">{availableBranches[0]?.name || 'My Branch'}</strong></span>
            <span className="text-[10px] bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-full font-bold ml-auto">
              {users.length} staff members
            </span>
          </div>
        )}

        {/* Controls Grid: Search, Branch Selector (Owner only), Status, Reset */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className={isOwner ? "lg:col-span-5" : "lg:col-span-7"}>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search staff by name, email, phone..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Branch Dropdown Filter (Visible only for Owner) */}
          {isOwner && (
            <div className="lg:col-span-4">
              <div className="relative">
                <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 pointer-events-none z-10" />
                <select
                  value={selectedBranchFilter}
                  onChange={e => setSelectedBranchFilter(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer appearance-none"
                >
                  <option value="ALL">🏢 All Branches ({branchCounts.ALL || users.length})</option>
                  {branches.map(b => (
                    <option key={b._id} value={b._id}>
                      📍 {b.name} ({branchCounts[String(b._id)] || 0})
                    </option>
                  ))}
                  <option value="UNASSIGNED">⚪ Unassigned Staff ({branchCounts.UNASSIGNED || 0})</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
              </div>
            </div>
          )}

          {/* Status Filter */}
          <div className={isOwner ? "lg:col-span-2" : "lg:col-span-3"}>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Staff</option>
              <option value="DISABLED">Disabled Staff</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className={isOwner ? "lg:col-span-1 flex justify-end" : "lg:col-span-2 flex justify-end"}>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer w-full justify-center shadow-2xs"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            ) : (
              <div className="text-[11px] text-slate-400 font-semibold text-center w-full py-2">
                {filteredUsers.length} staff
              </div>
            )}
          </div>
        </div>

        {/* Quick Branch Filter Pills (Visible only for Owner) */}
        {isOwner && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-2 border-t border-slate-100 scrollbar-thin">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
              <Filter className="w-3 h-3 text-slate-400" /> Filter Branch:
            </span>

            <button
              type="button"
              onClick={() => setSelectedBranchFilter('ALL')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                selectedBranchFilter === 'ALL'
                  ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              <span>All Hubs</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                selectedBranchFilter === 'ALL' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-600'
              }`}>
                {branchCounts.ALL || users.length}
              </span>
            </button>

            {branches.map(b => {
              const isSelected = selectedBranchFilter === String(b._id);
              const count = branchCounts[String(b._id)] || 0;
              return (
                <button
                  key={b._id}
                  type="button"
                  onClick={() => setSelectedBranchFilter(isSelected ? 'ALL' : String(b._id))}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-2xs font-bold ring-2 ring-emerald-500/20'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  <Building className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  <span>{b.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setSelectedBranchFilter(selectedBranchFilter === 'UNASSIGNED' ? 'ALL' : 'UNASSIGNED')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                selectedBranchFilter === 'UNASSIGNED'
                  ? 'bg-amber-600 text-white shadow-2xs font-bold ring-2 ring-amber-500/20'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              <span>Unassigned Staff</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                selectedBranchFilter === 'UNASSIGNED' ? 'bg-amber-700 text-amber-100' : 'bg-amber-200/70 text-amber-800'
              }`}>
                {branchCounts.UNASSIGNED || 0}
              </span>
            </button>
          </div>
        )}

        {/* Active Filters Summary strip */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-500 font-medium">
                Showing <strong className="text-slate-900">{filteredUsers.length}</strong> of {users.length} staff members:
              </span>

              {selectedBranchFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px]">
                  Branch: {selectedBranchFilter === 'UNASSIGNED' ? 'Unassigned' : branches.find(b => String(b._id) === String(selectedBranchFilter))?.name || 'Selected'}
                  <button type="button" onClick={() => setSelectedBranchFilter('ALL')} className="hover:text-emerald-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedRoleFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[11px]">
                  Role: {ROLE_COLORS[selectedRoleFilter]?.label || selectedRoleFilter}
                  <button type="button" onClick={() => setSelectedRoleFilter('ALL')} className="hover:text-blue-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {statusFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-[11px]">
                  Status: {statusFilter}
                  <button type="button" onClick={() => setStatusFilter('ALL')} className="hover:text-slate-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-[11px]">
                  Search: "{searchQuery}"
                  <button type="button" onClick={() => setSearchQuery('')} className="hover:text-amber-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-slate-500 hover:text-rose-600 underline cursor-pointer"
            >
              Clear all filters
            </button>
          </div>
        )}
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
        data={filteredUsers}
        isLoading={isLoading}
        emptyTitle={hasActiveFilters ? 'No matching staff members' : 'No staff members registered'}
        emptyDescription={
          hasActiveFilters
            ? 'No team members match your current filter criteria. Try selecting another branch or clearing your filters.'
            : 'No staff members registered. Create the first account using the button above.'
        }
        inlineScroll={true}
        minWidth="min-w-[1000px]"
        maxHeight="max-h-[600px]"
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
              options={isOwner ? CREATABLE_ROLES : CREATABLE_ROLES.filter(r => r.value === 'TELECALLER')}
            />
            <Select
              label="Assign Branch"
              value={!isOwner ? managerBranchId : formData.branchId}
              disabled={!isOwner}
              onChange={e => setFormData({ ...formData, branchId: e.target.value })}
              options={
                !isOwner
                  ? [{ value: managerBranchId, label: availableBranches[0]?.name || 'My Branch' }]
                  : [
                      { value: '', label: formData.role === 'MANAGER' ? '🏢 All Hubs (Multi-Branch)' : 'Select branch...' },
                      ...branches.map(b => ({ value: b._id, label: `${b.name} (${b.code})` }))
                    ]
              }
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
                branchId: !isOwner ? managerBranchId : (editData.branchId || null),
                branches: !isOwner ? (managerBranchId ? [managerBranchId] : []) : (editData.branchId ? [editData.branchId] : (editData.role === 'MANAGER' ? branches.map(b => b._id) : []))
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
              disabled={!isOwner}
              onChange={e => setEditData({ ...editData, role: e.target.value })}
              options={isOwner ? CREATABLE_ROLES : CREATABLE_ROLES.filter(r => r.value === 'TELECALLER')}
            />
            <Select
              label="Branch"
              value={!isOwner ? managerBranchId : (editData.branchId || '')}
              disabled={!isOwner}
              onChange={e => setEditData({ ...editData, branchId: e.target.value })}
              options={
                !isOwner
                  ? [{ value: managerBranchId, label: availableBranches[0]?.name || 'My Branch' }]
                  : [
                      { value: '', label: editData.role === 'MANAGER' ? '🏢 All Hubs (Multi-Branch)' : 'No branch' },
                      ...branches.map(b => ({ value: b._id, label: `${b.name} (${b.code})` }))
                    ]
              }
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
