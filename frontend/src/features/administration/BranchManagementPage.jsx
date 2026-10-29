import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  UserX,
  Key,
  Copy,
  Eye,
  EyeOff,
  Truck,
  ExternalLink,
  Sparkles,
  Share2,
  Lock,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Table } from '../../components/common/Table.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Select } from '../../components/common/Select.jsx';
import { useBranch } from '../../context/BranchContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export function BranchManagementPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const { selectedBranchId, selectBranch } = useBranch();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedBranchIds, setSelectedBranchIds] = useState([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const [selectedBranchForEdit, setSelectedBranchForEdit] = useState(null);
  const [selectedBranchForDelete, setSelectedBranchForDelete] = useState(null);
  const [actionMsg, setActionMsg] = useState('');

  // Owner Credentials Management state
  const [credentialsModalOpen, setCredentialsModalOpen] = useState(false);
  const [selectedBranchForCredentials, setSelectedBranchForCredentials] = useState(null);
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [copiedUserIndex, setCopiedUserIndex] = useState(null);
  const [resetPasswordModalUser, setResetPasswordModalUser] = useState(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [showResetPasswordVal, setShowResetPasswordVal] = useState(true);
  const [createAccountSubModalOpen, setCreateAccountSubModalOpen] = useState(false);
  const [newAccountFormData, setNewAccountFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'MANAGER',
    phone: ''
  });

  // Post-account creation modal state
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentialsModalOpen, setCreatedCredentialsModalOpen] = useState(false);
  const [newlyCreatedAccount, setNewlyCreatedAccount] = useState(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  const showToast = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 4000);
  };

  const initialFormState = {
    name: '',
    code: '',
    phone: '',
    email: '',
    branchType: 'COMPANY_OWNED',
    billerId: '1000058077',
    gstNumber: '',
    // Branch Head Login Profile (Give to Branch Head)
    headName: '',
    headEmail: '',
    headPassword: '',
    headPhone: '',
    // Shipping Label & Postal Pickup Details:
    pickupSenderName: 'SHANTHI AYURVEDAS',
    pickupContactPerson: '',
    pickupPhone: '',
    pickupAlternatePhone: '',
    pickupStreet: '',
    pickupCity: '',
    pickupState: 'Tamil Nadu',
    pickupPincode: '',
    pickupBookingOffice: '',
    pickupNotes: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [editFormData, setEditFormData] = useState({
    ...initialFormState,
    isActive: true,
    hasHeadAccount: false,
    existingPassword: null
  });

  // 1. Fetch Branches
  const { data: branchesResponse, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await apiClient.get('/branches');
      return res.data;
    }
  });
  const branches = Array.isArray(branchesResponse?.data) ? branchesResponse?.data : [];

  // 2. Fetch Users for Total Staff Metrics
  const { data: usersResponse } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: async () => {
      const res = await apiClient.get('/users');
      return res.data;
    }
  });
  const allUsers = Array.isArray(usersResponse?.data) ? usersResponse?.data : [];
  const totalStaffCount = allUsers.filter((u) => u.role !== 'OWNER').length;

  const createMutation = useMutation({
    mutationFn: (data) =>
      apiClient.post('/branches', {
        name: data.name,
        code: data.code.toUpperCase(),
        email: data.headEmail || data.email,
        phone: data.pickupPhone || data.phone || data.headPhone,
        alternatePhone: data.pickupAlternatePhone || '',
        branchType: data.branchType,
        billerId: data.billerId || '1000058077',
        gstNumber: data.gstNumber || '',
        headName: data.headName || `${data.name} Branch Head`,
        headEmail: data.headEmail,
        headPassword: data.headPassword,
        headPhone: data.headPhone || data.pickupPhone || data.phone,
        accountName: data.headName || `${data.name} Branch Head`,
        accountEmail: data.headEmail,
        accountPassword: data.headPassword,
        accountRole: 'MANAGER',
        address: {
          street: data.pickupStreet || '',
          city: data.pickupCity || '',
          state: data.pickupState || 'Tamil Nadu',
          pincode: data.pickupPincode || ''
        },
        postalPickupDetails: {
          senderName: data.pickupSenderName || 'SHANTHI AYURVEDAS',
          contactPerson: data.pickupContactPerson || data.headName || data.name,
          phone: data.pickupPhone || data.phone || data.headPhone,
          alternatePhone: data.pickupAlternatePhone || '',
          street: data.pickupStreet || '',
          city: data.pickupCity || '',
          state: data.pickupState || 'Tamil Nadu',
          pincode: data.pickupPincode || '',
          bookingOffice: data.pickupBookingOffice || '',
          notes: data.pickupNotes || ''
        }
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreateModalOpen(false);

      const createdAcc = res.data?.data?.createdAccount;
      if (createdAcc) {
        setNewlyCreatedAccount({
          ...createdAcc,
          branchName: formData.name,
          branchCode: formData.code.toUpperCase(),
          pickupDetails: {
            contactPerson: formData.pickupContactPerson || formData.headName || formData.name,
            phone: formData.pickupPhone || formData.phone,
            address: `${formData.pickupStreet || ''}, ${formData.pickupCity || ''} - ${formData.pickupPincode || ''}`
          }
        });
        setCreatedCredentialsModalOpen(true);
      } else {
        showToast('✓ Branch profile created successfully');
      }

      setFormData(initialFormState);
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
        phone: data.pickupPhone || data.phone || data.headPhone,
        alternatePhone: data.pickupAlternatePhone || '',
        email: data.headEmail || data.email,
        isActive: data.isActive,
        branchType: data.branchType,
        billerId: data.billerId || '1000058077',
        gstNumber: data.gstNumber || '',
        headName: data.headName,
        headEmail: data.headEmail,
        headPassword: data.headPassword || undefined,
        headPhone: data.headPhone || data.pickupPhone || data.phone,
        address: {
          street: data.pickupStreet || '',
          city: data.pickupCity || '',
          state: data.pickupState || 'Tamil Nadu',
          pincode: data.pickupPincode || ''
        },
        postalPickupDetails: {
          senderName: data.pickupSenderName || 'SHANTHI AYURVEDAS',
          contactPerson: data.pickupContactPerson || '',
          phone: data.pickupPhone || '',
          alternatePhone: data.pickupAlternatePhone || '',
          street: data.pickupStreet || '',
          city: data.pickupCity || '',
          state: data.pickupState || 'Tamil Nadu',
          pincode: data.pickupPincode || '',
          bookingOffice: data.pickupBookingOffice || '',
          notes: data.pickupNotes || ''
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['branch-credentials', selectedBranchForEdit?._id] });
      setEditModalOpen(false);
      setSelectedBranchForEdit(null);
      showToast('✓ Branch profile and pickup details updated successfully');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to update branch');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/branches/${id}`),
    onSuccess: (_, deletedId) => {
      // If the deleted branch was selected in the top bar, immediately switch back to 'ALL'
      if (selectedBranchId === deletedId || String(selectedBranchId) === String(deletedId)) {
        selectBranch('ALL');
      }
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-distributor-dashboard'] });
      setDeleteModalOpen(false);
      setSelectedBranchForDelete(null);
      showToast('✓ Branch deleted successfully');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to delete branch');
    }
  });

  // Bulk Delete Branches Mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (branchIds) => apiClient.post('/branches/bulk-delete', { branchIds }),
    onSuccess: (res, deletedIds) => {
      if (deletedIds?.includes(selectedBranchId) || deletedIds?.map(String).includes(String(selectedBranchId))) {
        selectBranch('ALL');
      }
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-distributor-dashboard'] });
      setSelectedBranchIds([]);
      setIsBulkDeleteModalOpen(false);
      showToast(`✓ Successfully deleted ${res.data?.data?.deletedCount ?? selectedBranchIds.length} branches`);
    },
    onError: (err) => alert(err.response?.data?.message || 'Failed to bulk delete branches')
  });

  // Fetch branch credentials for owner modal
  const {
    data: credentialsData,
    isLoading: isLoadingCredentials,
    refetch: refetchCredentials
  } = useQuery({
    queryKey: ['branch-credentials', selectedBranchForCredentials?._id],
    queryFn: async () => {
      const res = await apiClient.get(`/branches/${selectedBranchForCredentials._id}/credentials`);
      return res.data?.data;
    },
    enabled: Boolean(credentialsModalOpen && selectedBranchForCredentials?._id)
  });

  // Reset user password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }) => {
      const res = await apiClient.post(`/branches/${selectedBranchForCredentials._id}/credentials/reset-password`, {
        userId,
        newPassword
      });
      return res.data?.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['branch-credentials', selectedBranchForCredentials?._id] });
      setResetPasswordModalUser(null);
      setNewPasswordVal('');
      showToast(`✓ Password successfully updated for ${data.email}`);
    },
    onError: (err) => {
      showToast(`⚠️ ${err.response?.data?.message || 'Failed to update password'}`);
    }
  });

  // Create branch account mutation
  const createBranchAccountMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post(`/branches/${selectedBranchForCredentials._id}/credentials/create-account`, payload);
      return res.data?.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['branch-credentials', selectedBranchForCredentials?._id] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setCreateAccountSubModalOpen(false);
      setNewAccountFormData({ name: '', email: '', password: '', role: 'MANAGER', phone: '' });
      showToast(`✓ Created ${data.role} account for ${data.name}`);
    },
    onError: (err) => {
      showToast(`⚠️ ${err.response?.data?.message || 'Failed to create branch account'}`);
    }
  });

  const handleShareCredentialsWhatsApp = (account, branch) => {
    const rawPhone = account.phone || branch?.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);
    const pass = account.initialPassword || '(Contact Owner for Password)';
    const text = encodeURIComponent(
      `🌿 *Shanthi Ayurvedas Branch Login Credentials*\n\n` +
      `🏢 *Branch:* ${branch?.name || ''} (${branch?.code || ''})\n` +
      `👤 *Role:* ${account.role === 'DISTRIBUTOR' ? 'Branch Distributor' : 'Branch Manager'}\n` +
      `📧 *Username / Email:* ${account.email}\n` +
      `🔑 *Password:* ${pass}\n\n` +
      `🌐 *Login Portal:* https://shanthiayurvedas.com/login\n\n` +
      `Please log in with these credentials, accept the branch partnership agreement, and access your branch portal.`
    );
    const url = cleanPhone ? `https://wa.me/91${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const handleCopyAccountCredentials = (account, branch, index) => {
    const pass = account.initialPassword || '(Password securely saved in system)';
    const text =
      `*Shanthi Ayurvedas - Branch Login Account*\n\n` +
      `Branch: ${branch?.name || ''} (${branch?.code || ''})\n` +
      `Role: ${account.role}\n` +
      `Name: ${account.name}\n` +
      `Username: ${account.email}\n` +
      `Password: ${pass}\n` +
      `Portal: https://shanthiayurvedas.com/login`;
    navigator.clipboard.writeText(text);
    setCopiedUserIndex(index);
    setTimeout(() => setCopiedUserIndex(null), 3000);
  };

  const isAllSelected = branches.length > 0 && branches.every((b) => selectedBranchIds.includes(b._id));

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedBranchIds(branches.map((b) => b._id));
    } else {
      setSelectedBranchIds([]);
    }
  };

  const handleToggleSelectBranch = (id) => {
    setSelectedBranchIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOpenEdit = (branch) => {
    setSelectedBranchForEdit(branch);
    const cred = branch.initialCredentials?.find(
      (c) => c.role === 'MANAGER' || (branch.managerId && (c.userId === branch.managerId._id || c.userId === branch.managerId))
    );
    const headName = branch.managerName || branch.managerId?.name || cred?.name || '';
    const headEmail = branch.managerId?.email || cred?.email || (branch.code ? `${branch.code.toLowerCase()}.head@shanthiayurvedas.com` : '');
    const headPhone = branch.managerPhone || branch.managerId?.phone || cred?.phone || branch.phone || '';

    setEditFormData({
      name: branch.name || '',
      code: branch.code || '',
      phone: branch.phone || '',
      alternatePhone: branch.alternatePhone || '',
      email: branch.email || '',
      branchType: branch.branchType || 'COMPANY_OWNED',
      billerId: branch.billerId || '1000058077',
      gstNumber: branch.gstNumber || '',
      isActive: branch.isActive !== false,
      // Branch Head Profile details:
      headName,
      headEmail,
      headPhone,
      headPassword: '',
      existingPassword: cred?.password || branch.managerId?.initialPassword || null,
      hasHeadAccount: Boolean(branch.managerId || branch.managerName || cred),
      // Label & Pickup Details:
      pickupSenderName: branch.postalPickupDetails?.senderName || 'SHANTHI AYURVEDAS',
      pickupContactPerson: branch.postalPickupDetails?.contactPerson || '',
      pickupPhone: branch.postalPickupDetails?.phone || branch.phone || '',
      pickupAlternatePhone: branch.postalPickupDetails?.alternatePhone || branch.alternatePhone || '',
      pickupStreet: branch.postalPickupDetails?.street || branch.address?.street || '',
      pickupCity: branch.postalPickupDetails?.city || branch.address?.city || '',
      pickupState: branch.postalPickupDetails?.state || branch.address?.state || 'Tamil Nadu',
      pickupPincode: branch.postalPickupDetails?.pincode || branch.address?.pincode || '',
      pickupBookingOffice: branch.postalPickupDetails?.bookingOffice || '',
      pickupNotes: branch.postalPickupDetails?.notes || ''
    });
    setEditModalOpen(true);
  };

  const columns = [
    {
      key: 'select',
      header: (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={handleSelectAll}
            aria-label="Select all branches on this page"
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
        </div>
      ),
      className: 'w-10 text-center px-2',
      cell: (row) => (
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selectedBranchIds.includes(row._id)}
            onChange={() => handleToggleSelectBranch(row._id)}
            aria-label={`Select ${row.name}`}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
        </div>
      )
    },
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
      header: 'Branch Head Account',
      cell: (row) => {
        const mgrName = row.managerName || row.managerId?.name;
        const mgrPhone = row.managerPhone || row.managerId?.phone;
        const mgrEmail = row.managerId?.email || row.email;
        const cred = row.initialCredentials?.find(
          (c) => c.role === 'MANAGER' || (row.managerId && (c.userId === row.managerId._id || c.userId === row.managerId))
        );

        if (!mgrName && !cred) {
          return (
            <div className="flex flex-col items-start gap-1">
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
                <AlertTriangle className="w-3 h-3 text-amber-600" /> No Head Set
              </span>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBranchForCredentials(row);
                    setCreateAccountSubModalOpen(true);
                  }}
                  className="text-[10px] text-emerald-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-2.5 h-2.5" /> Set Up Head Login
                </button>
              )}
            </div>
          );
        }

        const headName = mgrName || cred?.name || `${row.name} Head`;
        const headEmail = mgrEmail || cred?.email || '—';
        const headPhone = mgrPhone || cred?.phone || row.phone || '';

        return (
          <div className="text-xs">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="text-xs">👑</span>
              <span>{headName}</span>
              <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-semibold">
                Branch Head
              </span>
            </div>
            <div className="text-[11px] text-slate-600 font-mono mt-0.5 flex items-center gap-1">
              <Mail className="w-2.5 h-2.5 text-slate-400 shrink-0" />
              <span className="truncate max-w-[190px]">{headEmail}</span>
            </div>
            {headPhone && (
              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                <Phone className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                <span>{headPhone}</span>
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: 'Postal Pickup Point',
      cell: (row) => {
        const pickup = row.postalPickupDetails;
        if (!pickup || (!pickup.contactPerson && !pickup.street && !pickup.phone)) {
          return (
            <span className="text-[11px] text-slate-400 italic flex items-center gap-1">
              <Truck className="w-3 h-3 text-slate-300" /> Physical address
            </span>
          );
        }
        return (
          <div className="text-xs">
            <div className="font-semibold text-slate-800 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{pickup.contactPerson || 'Postal Dispatch'}</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              {pickup.phone ? `${pickup.phone} • ` : ''}{pickup.pincode ? `PIN: ${pickup.pincode}` : pickup.city || ''}
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
          {/* View Panel Button */}
          <button
            type="button"
            title="Switch & View this Branch Panel (Boss Access)"
            onClick={() => {
              selectBranch(row._id);
              navigate('/dashboard?view=manager');
            }}
            className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 shadow-xs flex items-center gap-1 cursor-pointer"
          >
            <span>👁️</span>
            <span className="hidden sm:inline">View Panel</span>
          </button>

          {/* Owner Credentials Button */}
          {isOwner && (
            <button
              type="button"
              title="View & Manage Branch Login Credentials (Owner Only)"
              onClick={() => {
                setSelectedBranchForCredentials(row);
                setCredentialsModalOpen(true);
              }}
              className="px-2.5 py-1 text-[11px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-300 shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-amber-700" />
              <span>Credentials</span>
            </button>
          )}

          {/* Edit Branch Button */}
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
            Create autonomous operating branches & franchises with dedicated Branch Head logins. Each branch head manages their own team independently.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setCreateModalOpen(true)}>
          Add New Branch
        </Button>
      </div>

      {/* Bento Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Operating Hubs & Franchises</div>
          <div className="bento-metric-value text-slate-900">{branches.length}</div>
          <div className="text-[11px] text-slate-500 font-medium">Autonomous dispensary branches</div>
        </div>
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Branch Head Logins</div>
          <div className="bento-metric-value text-emerald-700">
            {branches.filter((b) => b.managerId || b.managerName || (b.initialCredentials && b.initialCredentials.length > 0)).length}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium">Active branch administrators</div>
        </div>
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Franchise Partners</div>
          <div className="bento-metric-value text-blue-700">
            {branches.filter((b) => b.branchType === 'FRANCHISE').length}
          </div>
          <div className="text-[11px] text-blue-600 font-medium">Licensed franchise dispensaries</div>
        </div>
        <div className="bento-card flex flex-col gap-1">
          <div className="bento-metric-title">Live Stations</div>
          <div className="bento-metric-value text-indigo-600">
            {branches.filter((b) => b.isActive).length}
          </div>
          <div className="text-[11px] text-indigo-600 font-medium">Active for booking & dispatch</div>
        </div>
      </div>

      {/* Bulk Operations Toolbar */}
      <div className={`rounded-xl p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs border transition-all ${
        selectedBranchIds.length > 0
          ? 'bg-amber-50/90 border-amber-300 shadow-sm ring-1 ring-amber-300'
          : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer select-none bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs hover:border-emerald-400">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span>Select All</span>
          </label>
          {selectedBranchIds.length > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white font-bold text-[11px] shadow-2xs animate-in fade-in">
              {selectedBranchIds.length} Selected
            </span>
          )}
        </div>

        {selectedBranchIds.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedBranchIds([])}
              className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-semibold text-xs cursor-pointer"
            >
              Deselect All
            </button>
            <Button
              size="sm"
              variant="danger"
              icon={Trash2}
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              Delete Selected ({selectedBranchIds.length})
            </Button>
          </div>
        )}
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
        title="Add New Branch / Franchise"
        subtitle="Configure branch identity, login credentials, and shipping pickup address"
        maxWidth="max-w-2xl"
        icon="🏢"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(formData);
          }}
          className="space-y-4 max-h-[80vh] overflow-y-auto px-1 pr-2"
        >
          {/* Section 1: Branch Identity */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 border-b pb-1.5 flex items-center justify-between">
              <span>1. Branch Profile & Identity</span>
              <span className="text-[11px] text-slate-400 font-normal">Independent branch profile</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Branch Name *"
                required
                placeholder="e.g. Salem Franchise Branch"
                value={formData.name}
                onChange={(e) => {
                  const val = e.target.value;
                  const autoCode = val ? val.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'BR') : '';
                  const autoEmail = autoCode ? `${autoCode.toLowerCase()}.head@shanthiayurvedas.com` : '';
                  const randPass = formData.headPassword || `Shanthi@${Math.floor(1000 + Math.random() * 9000)}`;
                  setFormData((prev) => ({
                    ...prev,
                    name: val,
                    code: prev.code || autoCode,
                    headName: prev.headName || (val ? `${val} Branch Head` : ''),
                    headEmail: prev.headEmail || autoEmail,
                    headPassword: randPass,
                    pickupContactPerson: prev.pickupContactPerson || (val ? `${val} Dispatch Head` : '')
                  }));
                }}
              />
              <Input
                label="Branch Code *"
                required
                placeholder="e.g. SLM"
                value={formData.code}
                onChange={(e) => {
                  const c = e.target.value.toUpperCase();
                  setFormData((prev) => ({
                    ...prev,
                    code: c,
                    headEmail: prev.headEmail || (c ? `${c.toLowerCase()}.head@shanthiayurvedas.com` : '')
                  }));
                }}
              />
              <Select
                label="Branch Type"
                value={formData.branchType}
                onChange={(e) => setFormData({ ...formData, branchType: e.target.value })}
                options={[
                  { value: 'FRANCHISE', label: 'Franchise Partner' },
                  { value: 'COMPANY_OWNED', label: 'Company Owned' }
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Contact Phone"
                placeholder="e.g. 9876543210"
                value={formData.phone}
                onChange={(e) => {
                  const p = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    phone: p,
                    headPhone: prev.headPhone || p,
                    pickupPhone: prev.pickupPhone || p
                  }));
                }}
              />
              <Input
                label="Speed Post Biller ID"
                placeholder="1000058077"
                value={formData.billerId}
                onChange={(e) => setFormData({ ...formData, billerId: e.target.value })}
              />
              <Input
                label="GSTIN (GST Number)"
                placeholder="e.g. 33BNCPS0374P1ZM"
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
              />
            </div>
          </div>

          {/* Section 2: Branch Head Login Profile (Give to Branch Head) */}
          <div className="space-y-3 bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-700" />
                <span>2. Branch Head Login Profile (Give to Branch Head)</span>
              </h4>
              <Badge variant="emerald" size="sm">Autonomous Portal</Badge>
            </div>

            <div className="bg-white/80 border border-emerald-200/80 rounded-lg p-2.5 text-xs text-emerald-900 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">No Central Manager/Distributor Assignment Needed</p>
                <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                  Give these login credentials to the Branch Head. Upon login, the Branch Head will manage their own branch, assign roles, and add their own team members (telecallers, dispatchers) without interconnecting with other branches.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Branch Head Full Name *"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.headName}
                  onChange={(e) => setFormData({ ...formData, headName: e.target.value })}
                />
                <Input
                  label="Branch Head Phone (For WhatsApp)"
                  placeholder="e.g. 9876543210"
                  value={formData.headPhone}
                  onChange={(e) => setFormData({ ...formData, headPhone: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Username / Login Email *"
                  required
                  placeholder="e.g. salem.head@shanthiayurvedas.com"
                  value={formData.headEmail}
                  onChange={(e) => setFormData({ ...formData, headEmail: e.target.value })}
                />
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Password *</label>
                    <button
                      type="button"
                      onClick={() => {
                        const randPass = `Shanthi@${Math.floor(1000 + Math.random() * 9000)}`;
                        setFormData({ ...formData, headPassword: randPass });
                      }}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Sparkles className="w-2.5 h-2.5" /> Auto-Generate
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      required
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Set password"
                      value={formData.headPassword}
                      onChange={(e) => setFormData({ ...formData, headPassword: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Shipping Pickup & From Address */}
          <div className="space-y-3 bg-blue-50/60 p-3.5 rounded-xl border border-blue-200/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5 border-b border-blue-200/80 pb-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-700" />
              <span>3. Shipping Label & Pickup Address</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Sender Brand Name *"
                required
                placeholder="e.g. SHANTHI AYURVEDAS"
                value={formData.pickupSenderName}
                onChange={(e) => setFormData({ ...formData, pickupSenderName: e.target.value })}
              />
              <Input
                label="Pickup Contact Person *"
                required
                placeholder="e.g. Ramesh Kumar"
                value={formData.pickupContactPerson}
                onChange={(e) => setFormData({ ...formData, pickupContactPerson: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Dispatch Phone 1 *"
                required
                placeholder="e.g. 8884747209"
                value={formData.pickupPhone}
                onChange={(e) => setFormData({ ...formData, pickupPhone: e.target.value })}
              />
              <Input
                label="Dispatch Phone 2 (Alternate)"
                placeholder="e.g. 8884113629"
                value={formData.pickupAlternatePhone}
                onChange={(e) => setFormData({ ...formData, pickupAlternatePhone: e.target.value })}
              />
            </div>

            <Input
              label="Street Address *"
              required
              placeholder="e.g. NO15, JAYPEE GATEWAY, ANTHIVADI"
              value={formData.pickupStreet}
              onChange={(e) => setFormData({ ...formData, pickupStreet: e.target.value })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="City *"
                required
                placeholder="e.g. Hosur"
                value={formData.pickupCity}
                onChange={(e) => setFormData({ ...formData, pickupCity: e.target.value })}
              />
              <Select
                label="State *"
                value={formData.pickupState}
                onChange={(e) => setFormData({ ...formData, pickupState: e.target.value })}
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
                label="Pincode *"
                required
                placeholder="e.g. 635110"
                value={formData.pickupPincode}
                onChange={(e) => setFormData({ ...formData, pickupPincode: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Booking Post Office"
                placeholder="e.g. HOSUR BPC POST - 635110"
                value={formData.pickupBookingOffice}
                onChange={(e) => setFormData({ ...formData, pickupBookingOffice: e.target.value })}
              />
              <Input
                label="Special Pickup Notes / Landmark"
                placeholder="e.g. Near bus stand, dispatch counter"
                value={formData.pickupNotes}
                onChange={(e) => setFormData({ ...formData, pickupNotes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100 sticky bottom-0 bg-white py-2">
            <Button variant="secondary" type="button" className="w-full sm:w-auto" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" className="w-full sm:w-auto" isLoading={createMutation.isPending}>
              Create Branch Profile & Head Login
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── EDIT BRANCH MODAL ── */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Branch & Head Profile"
        subtitle={`Update profile, postal pickup, and branch head access for ${selectedBranchForEdit?.name || 'Branch'}`}
        maxWidth="max-w-2xl"
        icon="✏️"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            editMutation.mutate(editFormData);
          }}
          className="space-y-4 max-h-[80vh] overflow-y-auto px-1 pr-2"
        >
          {/* Section 1: Branch Identity */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 border-b pb-1.5 flex items-center justify-between">
              <span>1. Branch Profile & Identity</span>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editFormData.isActive}
                  onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span>Active Branch</span>
              </label>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              <Select
                label="Branch Type"
                value={editFormData.branchType}
                onChange={(e) => setEditFormData({ ...editFormData, branchType: e.target.value })}
                options={[
                  { value: 'COMPANY_OWNED', label: 'Company Owned' },
                  { value: 'FRANCHISE', label: 'Franchise Partner' }
                ]}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Contact Phone"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
              />
              <Input
                label="Speed Post Biller ID"
                placeholder="1000058077"
                value={editFormData.billerId}
                onChange={(e) => setEditFormData({ ...editFormData, billerId: e.target.value })}
              />
              <Input
                label="GSTIN (GST Number)"
                placeholder="e.g. 33BNCPS0374P1ZM"
                value={editFormData.gstNumber}
                onChange={(e) => setEditFormData({ ...editFormData, gstNumber: e.target.value })}
              />
            </div>
          </div>

          {/* Section 2: Shipping Pickup & From Address */}
          <div className="space-y-3 bg-blue-50/60 p-3.5 rounded-xl border border-blue-200/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5 border-b border-blue-200/80 pb-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-700" />
              <span>2. Shipping Label & Pickup Address</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Sender Brand Name *"
                required
                placeholder="e.g. SHANTHI AYURVEDAS"
                value={editFormData.pickupSenderName}
                onChange={(e) => setEditFormData({ ...editFormData, pickupSenderName: e.target.value })}
              />
              <Input
                label="Pickup Contact Person"
                placeholder="e.g. Ramesh Kumar"
                value={editFormData.pickupContactPerson}
                onChange={(e) => setEditFormData({ ...editFormData, pickupContactPerson: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Dispatch Phone 1"
                placeholder="e.g. 8884747209"
                value={editFormData.pickupPhone}
                onChange={(e) => setEditFormData({ ...editFormData, pickupPhone: e.target.value })}
              />
              <Input
                label="Dispatch Phone 2 (Alternate)"
                placeholder="e.g. 8884113629"
                value={editFormData.pickupAlternatePhone}
                onChange={(e) => setEditFormData({ ...editFormData, pickupAlternatePhone: e.target.value })}
              />
            </div>

            <Input
              label="Street Address"
              placeholder="e.g. NO15, JAYPEE GATEWAY, ANTHIVADI"
              value={editFormData.pickupStreet}
              onChange={(e) => setEditFormData({ ...editFormData, pickupStreet: e.target.value })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="City"
                placeholder="e.g. Hosur"
                value={editFormData.pickupCity}
                onChange={(e) => setEditFormData({ ...editFormData, pickupCity: e.target.value })}
              />
              <Select
                label="State"
                value={editFormData.pickupState}
                onChange={(e) => setEditFormData({ ...editFormData, pickupState: e.target.value })}
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
                placeholder="e.g. 635110"
                value={editFormData.pickupPincode}
                onChange={(e) => setEditFormData({ ...editFormData, pickupPincode: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Booking Post Office"
                placeholder="e.g. HOSUR BPC POST - 635110"
                value={editFormData.pickupBookingOffice}
                onChange={(e) => setEditFormData({ ...editFormData, pickupBookingOffice: e.target.value })}
              />
              <Input
                label="Special Pickup Notes / Landmark"
                placeholder="e.g. Near bus stand, dispatch counter"
                value={editFormData.pickupNotes}
                onChange={(e) => setEditFormData({ ...editFormData, pickupNotes: e.target.value })}
              />
            </div>
          </div>

          {/* Section 3: Branch Head Profile & Access (Replaces Manager & Distributor Assignment) */}
          <div className="space-y-3 bg-amber-50/70 p-3.5 rounded-xl border border-amber-200">
            <div className="flex items-center justify-between border-b border-amber-200 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                <span>👑</span>
                <span>3. Branch Head Profile & Login Access</span>
              </h4>
              <Badge variant="warning" size="sm">Branch Admin</Badge>
            </div>

            {editFormData.hasHeadAccount ? (
              <div className="space-y-3">
                <div className="bg-white p-3 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <span>👑</span>
                      <span>{editFormData.headName || 'Branch Head'}</span>
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-semibold">
                        Branch Head / Manager
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono mt-1 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span>{editFormData.headEmail || 'No email'}</span>
                      {editFormData.headPhone && (
                        <>
                          <span className="text-slate-300">•</span>
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{editFormData.headPhone}</span>
                        </>
                      )}
                    </div>
                    {editFormData.existingPassword && (
                      <div className="text-[11px] text-emerald-800 font-mono mt-1.5 flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 w-fit">
                        <Key className="w-3 h-3 text-emerald-600" />
                        <span>Password: <strong>{revealedPasswords['edit_head'] ? editFormData.existingPassword : '••••••••'}</strong></span>
                        <button
                          type="button"
                          onClick={() => setRevealedPasswords(prev => ({ ...prev, edit_head: !prev['edit_head'] }))}
                          className="ml-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          {revealedPasswords['edit_head'] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBranchForCredentials(selectedBranchForEdit);
                      setCredentialsModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors border border-amber-300 shadow-2xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-700" />
                    <span>View / WhatsApp Credentials</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <Input
                    label="Update Branch Head Name"
                    value={editFormData.headName}
                    onChange={(e) => setEditFormData({ ...editFormData, headName: e.target.value })}
                  />
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">Reset Password (Optional)</label>
                      <button
                        type="button"
                        onClick={() => {
                          const randPass = `Shanthi@${Math.floor(1000 + Math.random() * 9000)}`;
                          setEditFormData({ ...editFormData, headPassword: randPass });
                        }}
                        className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Sparkles className="w-2.5 h-2.5" /> Auto-Generate
                      </button>
                    </div>
                    <Input
                      placeholder="Leave blank to keep existing password"
                      value={editFormData.headPassword}
                      onChange={(e) => setEditFormData({ ...editFormData, headPassword: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-amber-800">
                  No Branch Head account is currently created for this branch. Create the login account below so the Branch Head can log in and manage team members.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Branch Head Full Name *"
                    placeholder="e.g. Ramesh Kumar"
                    value={editFormData.headName}
                    onChange={(e) => setEditFormData({ ...editFormData, headName: e.target.value })}
                  />
                  <Input
                    label="Branch Head Phone"
                    placeholder="e.g. 9876543210"
                    value={editFormData.headPhone}
                    onChange={(e) => setEditFormData({ ...editFormData, headPhone: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Username / Login Email *"
                    placeholder="e.g. head@shanthiayurvedas.com"
                    value={editFormData.headEmail}
                    onChange={(e) => setEditFormData({ ...editFormData, headEmail: e.target.value })}
                  />
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">Set Initial Password *</label>
                      <button
                        type="button"
                        onClick={() => {
                          const randPass = `Shanthi@${Math.floor(1000 + Math.random() * 9000)}`;
                          setEditFormData({ ...editFormData, headPassword: randPass });
                        }}
                        className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Sparkles className="w-2.5 h-2.5" /> Auto-Generate
                      </button>
                    </div>
                    <Input
                      placeholder="Enter password"
                      value={editFormData.headPassword}
                      onChange={(e) => setEditFormData({ ...editFormData, headPassword: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100 sticky bottom-0 bg-white py-2">
            <Button variant="secondary" type="button" className="w-full sm:w-auto" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" className="w-full sm:w-auto" isLoading={editMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── FRANCHISE CREDENTIALS SUCCESS MODAL (SHARE WITH FRANCHISE OWNER) ── */}
      {createdCredentialsModalOpen && newlyCreatedAccount && (
        <Modal
          isOpen={createdCredentialsModalOpen}
          onClose={() => setCreatedCredentialsModalOpen(false)}
          title="Branch & Franchise Account Created!"
          subtitle="Share these login credentials and pickup details with the franchise lead"
          maxWidth="max-w-lg"
          icon="🎉"
        >
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <span className="text-xs font-bold text-emerald-900 uppercase">
                  {newlyCreatedAccount.branchName} ({newlyCreatedAccount.branchCode})
                </span>
                <Badge variant="emerald" size="sm">{newlyCreatedAccount.role}</Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-emerald-100">
                  <span className="text-slate-500">Contact / Name:</span>
                  <span className="font-bold text-slate-900">{newlyCreatedAccount.name}</span>
                </div>
                <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-emerald-100">
                  <span className="text-slate-500">Username / Email:</span>
                  <span className="font-mono font-bold text-slate-900 select-all">{newlyCreatedAccount.username || newlyCreatedAccount.email}</span>
                </div>
                <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-emerald-100">
                  <span className="text-slate-500">Password:</span>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded select-all">{newlyCreatedAccount.password}</span>
                </div>
                {newlyCreatedAccount.pickupDetails?.address && (
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                    <span className="text-slate-500 block mb-0.5">Postal Pickup Point:</span>
                    <span className="font-medium text-slate-800 text-[11px] block">{newlyCreatedAccount.pickupDetails.address}</span>
                    <span className="font-mono text-slate-500 text-[10px]">Contact: {newlyCreatedAccount.pickupDetails.contactPerson} ({newlyCreatedAccount.pickupDetails.phone})</span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
              📋 <strong>Instructions for Branch Head:</strong> Give this username and password to the Branch Head. When they log in, they can view their branch orders, add team members (telecallers, distributors, dispatchers), and assign roles independently for their branch.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                onClick={() => {
                  const rawPhone = newlyCreatedAccount.pickupDetails?.phone || newlyCreatedAccount.phone || formData.headPhone || '';
                  const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);
                  const text = encodeURIComponent(
                    `🌿 *Shanthi Ayurvedas - Branch Head Login Credentials*\n\n` +
                    `🏢 *Branch:* ${newlyCreatedAccount.branchName} (${newlyCreatedAccount.branchCode})\n` +
                    `👑 *Designation:* Branch Head / Manager\n` +
                    `👤 *Name:* ${newlyCreatedAccount.name}\n` +
                    `📧 *Username / Login:* ${newlyCreatedAccount.username || newlyCreatedAccount.email}\n` +
                    `🔑 *Password:* ${newlyCreatedAccount.password}\n\n` +
                    `🌐 *Login Portal:* https://shanthiayurvedas.com/login\n\n` +
                    `Welcome to Shanthi Ayurvedas! Please log in to access your branch desk, assign roles, and add your team members.`
                  );
                  const url = cleanPhone ? `https://wa.me/91${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
                  window.open(url, '_blank');
                }}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share on WhatsApp</span>
              </button>
              <Button
                variant="primary"
                type="button"
                className="w-full sm:w-auto flex items-center justify-center gap-1.5"
                onClick={() => {
                  const credsText = `*Shanthi Ayurvedas - Branch Head Login Account*\n\nBranch: ${newlyCreatedAccount.branchName} (${newlyCreatedAccount.branchCode})\nRole: Branch Head / Manager\nName: ${newlyCreatedAccount.name}\nUsername: ${newlyCreatedAccount.username || newlyCreatedAccount.email}\nPassword: ${newlyCreatedAccount.password}\n\nPostal Pickup: ${newlyCreatedAccount.pickupDetails?.address || 'Configured in Branch'}\nContact: ${newlyCreatedAccount.pickupDetails?.contactPerson || newlyCreatedAccount.name} (${newlyCreatedAccount.pickupDetails?.phone || ''})\n\nPortal: https://shanthiayurvedas.com/login\n\nPlease log in to access your branch portal, assign roles, and add your team members.`;
                  navigator.clipboard.writeText(credsText);
                  setCopiedCredentials(true);
                  setTimeout(() => setCopiedCredentials(false), 3000);
                }}
              >
                {copiedCredentials ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCredentials ? 'Copied to Clipboard!' : 'Copy Login Details'}</span>
              </Button>
              <Button
                variant="secondary"
                type="button"
                className="w-full sm:w-auto"
                onClick={() => setCreatedCredentialsModalOpen(false)}
              >
                Done / Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── OWNER BRANCH CREDENTIALS MANAGEMENT MODAL ── */}
      {credentialsModalOpen && selectedBranchForCredentials && (
        <Modal
          isOpen={credentialsModalOpen}
          onClose={() => {
            setCredentialsModalOpen(false);
            setSelectedBranchForCredentials(null);
            setRevealedPasswords({});
          }}
          title={`🔑 ${selectedBranchForCredentials.name} — Login Credentials`}
          subtitle={`Branch Code: ${selectedBranchForCredentials.code} • Confidential Owner Access`}
          maxWidth="max-w-2xl"
          icon="🔐"
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1 pr-1.5">
            {/* Top Bar with Info & Add Button */}
            <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-start gap-2 text-xs text-amber-900">
                <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Owner Security:</strong> Passwords and login details are securely stored. Share credentials with the branch manager or distributor via WhatsApp or Copy.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNewAccountFormData({
                    name: '',
                    email: `${selectedBranchForCredentials.code.toLowerCase()}.mgr@shanthiayurvedas.com`,
                    password: `Shanthi@${Math.floor(1000 + Math.random() * 9000)}`,
                    role: 'MANAGER',
                    phone: selectedBranchForCredentials.phone || ''
                  });
                  setCreateAccountSubModalOpen(true);
                }}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Login Account</span>
              </button>
            </div>

            {/* Loading State */}
            {isLoadingCredentials ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                <span>Loading branch credentials…</span>
              </div>
            ) : credentialsData?.credentials && credentialsData.credentials.length > 0 ? (
              <div className="space-y-3">
                {credentialsData.credentials.map((account, idx) => {
                  const isRevealed = Boolean(revealedPasswords[account.id]);
                  const hasPassword = Boolean(account.initialPassword);
                  const isCopied = copiedUserIndex === idx;

                  return (
                    <div
                      key={account.id}
                      className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3 hover:border-emerald-300 transition-colors"
                    >
                      {/* Account Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                            account.isBranchHead || account.role === 'MANAGER'
                              ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs font-extrabold'
                              : account.role === 'DISTRIBUTOR'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-purple-50 text-purple-800 border-purple-200'
                          }`}>
                            {account.isBranchHead || account.role === 'MANAGER'
                              ? '👑 Branch Head'
                              : account.role === 'DISTRIBUTOR'
                              ? '📦 Branch Distributor'
                              : `👤 ${account.role}`}
                          </span>
                          <span className="font-bold text-slate-900 text-xs">{account.name}</span>
                          {account.phone && (
                            <span className="text-[11px] text-slate-500 font-mono">({account.phone})</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setResetPasswordModalUser(account);
                              setNewPasswordVal(`Shanthi@${Math.floor(1000 + Math.random() * 9000)}`);
                            }}
                            className="px-2 py-1 text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                            title="Reset Password"
                          >
                            <RefreshCw className="w-3 h-3 text-slate-500" />
                            <span>Reset Password</span>
                          </button>
                        </div>
                      </div>

                      {/* Credentials Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {/* Username / Email */}
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                          <div className="min-w-0 pr-2">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Username / Email</span>
                            <span className="font-mono font-bold text-slate-900 truncate block text-xs select-all">
                              {account.email}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(account.email);
                              showToast(`✓ Copied username: ${account.email}`);
                            }}
                            className="p-1 text-slate-400 hover:text-emerald-700 rounded hover:bg-white cursor-pointer"
                            title="Copy Username"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Password */}
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                          <div className="min-w-0 pr-2">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Password</span>
                            <span className="font-mono font-bold text-emerald-800 truncate block text-xs select-all">
                              {hasPassword
                                ? (isRevealed ? account.initialPassword : '••••••••••••')
                                : '•••••••• (Encrypted)'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {hasPassword ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setRevealedPasswords((prev) => ({ ...prev, [account.id]: !prev[account.id] }))}
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-white cursor-pointer"
                                  title={isRevealed ? 'Hide Password' : 'Show Password'}
                                >
                                  {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(account.initialPassword);
                                    showToast('✓ Password copied to clipboard');
                                  }}
                                  className="p-1 text-slate-400 hover:text-emerald-700 rounded hover:bg-white cursor-pointer"
                                  title="Copy Password"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setResetPasswordModalUser(account);
                                  setNewPasswordVal(`Shanthi@${Math.floor(1000 + Math.random() * 9000)}`);
                                }}
                                className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                              >
                                Set Password
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons: Copy All & Share WhatsApp */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                        <div className="text-[11px] text-slate-500 font-mono">
                          Portal: <span className="text-emerald-700 font-semibold">https://shanthiayurvedas.com/login</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyAccountCredentials(account, selectedBranchForCredentials, idx)}
                            className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{isCopied ? 'Copied Details!' : 'Copy Details'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleShareCredentialsWhatsApp(account, selectedBranchForCredentials)}
                            className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Share on WhatsApp</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Empty state if no account created */
              <div className="p-8 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto text-xl font-bold">
                  🔑
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">No Login Account Found</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    No dedicated login account has been created for {selectedBranchForCredentials.name} yet. Create an account to give the branch manager or distributor login access.
                  </p>
                </div>
                <Button
                  variant="primary"
                  icon={Plus}
                  onClick={() => {
                    setNewAccountFormData({
                      name: '',
                      email: `${selectedBranchForCredentials.code.toLowerCase()}.mgr@shanthiayurvedas.com`,
                      password: `Shanthi@${Math.floor(1000 + Math.random() * 9000)}`,
                      role: 'MANAGER',
                      phone: selectedBranchForCredentials.phone || ''
                    });
                    setCreateAccountSubModalOpen(true);
                  }}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
                >
                  Create Branch Account Now
                </Button>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setCredentialsModalOpen(false);
                  setSelectedBranchForCredentials(null);
                  setRevealedPasswords({});
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── RESET USER PASSWORD SUB-MODAL ── */}
      {resetPasswordModalUser && (
        <Modal
          isOpen={Boolean(resetPasswordModalUser)}
          onClose={() => setResetPasswordModalUser(null)}
          title={`Reset Password for ${resetPasswordModalUser.name}`}
          subtitle={`Username / Email: ${resetPasswordModalUser.email}`}
          maxWidth="max-w-md"
          icon="🔑"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              resetPasswordMutation.mutate({
                userId: resetPasswordModalUser.id,
                newPassword: newPasswordVal
              });
            }}
            className="space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">New Password *</label>
                <button
                  type="button"
                  onClick={() => setNewPasswordVal(`Shanthi@${Math.floor(1000 + Math.random() * 9000)}`)}
                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Sparkles className="w-2.5 h-2.5" /> Auto-Generate
                </button>
              </div>
              <div className="relative">
                <Input
                  required
                  type={showResetPasswordVal ? 'text' : 'password'}
                  placeholder="Enter new password (min 4 characters)"
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowResetPasswordVal(!showResetPasswordVal)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showResetPasswordVal ? 'Hide password' : 'Show password'}
                >
                  {showResetPasswordVal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                This will immediately update the login password and store it for the owner's reference.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setResetPasswordModalUser(null)}
                disabled={resetPasswordMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                isLoading={resetPasswordMutation.isPending}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
              >
                Save & Update Password
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── CREATE BRANCH ACCOUNT SUB-MODAL ── */}
      {createAccountSubModalOpen && selectedBranchForCredentials && (
        <Modal
          isOpen={createAccountSubModalOpen}
          onClose={() => setCreateAccountSubModalOpen(false)}
          title={`Create Login Account for ${selectedBranchForCredentials.name}`}
          subtitle="Add a dedicated Branch Manager or Distributor login"
          maxWidth="max-w-md"
          icon="👤"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createBranchAccountMutation.mutate(newAccountFormData);
            }}
            className="space-y-3.5"
          >
            <Input
              label="Contact / Lead Name *"
              required
              placeholder="e.g. Ramesh Kumar"
              value={newAccountFormData.name}
              onChange={(e) => setNewAccountFormData({ ...newAccountFormData, name: e.target.value })}
            />

            <Select
              label="Assigned Role *"
              value={newAccountFormData.role}
              onChange={(e) => setNewAccountFormData({ ...newAccountFormData, role: e.target.value })}
              options={[
                { value: 'MANAGER', label: 'Branch Manager (Manage branch orders & callers)' },
                { value: 'DISTRIBUTOR', label: 'Distributor (Manage inventory stock & fulfillment)' }
              ]}
            />

            <Input
              label="Username / Email *"
              required
              type="email"
              placeholder="e.g. salem.mgr@shanthiayurvedas.com"
              value={newAccountFormData.email}
              onChange={(e) => setNewAccountFormData({ ...newAccountFormData, email: e.target.value })}
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Password *</label>
                <button
                  type="button"
                  onClick={() => setNewAccountFormData({
                    ...newAccountFormData,
                    password: `Shanthi@${Math.floor(1000 + Math.random() * 9000)}`
                  })}
                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Sparkles className="w-2.5 h-2.5" /> Auto-Generate
                </button>
              </div>
              <Input
                required
                type="text"
                placeholder="Set password"
                value={newAccountFormData.password}
                onChange={(e) => setNewAccountFormData({ ...newAccountFormData, password: e.target.value })}
              />
            </div>

            <Input
              label="Contact Phone"
              placeholder="e.g. 9876543210"
              value={newAccountFormData.phone}
              onChange={(e) => setNewAccountFormData({ ...newAccountFormData, phone: e.target.value })}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setCreateAccountSubModalOpen(false)}
                disabled={createBranchAccountMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                isLoading={createBranchAccountMutation.isPending}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
              >
                Create Account
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── DELETE BRANCH CONFIRMATION DIALOG (CENTERED MODAL) ── */}
      {deleteModalOpen && selectedBranchForDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => !deleteMutation.isPending && setDeleteModalOpen(false)}
            aria-hidden="true"
          />

          {/* Dialog Box */}
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 z-10 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Branch Deletion</h3>
                <p className="text-xs text-slate-500">Please confirm before deleting this branch</p>
              </div>
            </div>

            <div className="p-4 bg-rose-50/70 border border-rose-200/80 rounded-xl text-xs space-y-2.5 text-rose-900">
              <p className="font-semibold text-rose-950">
                Are you sure you want to permanently delete this branch?
              </p>
              <div className="p-3 bg-white rounded-lg border border-rose-200 font-mono font-bold text-slate-900 flex items-center justify-between shadow-2xs">
                <span className="truncate pr-2">{selectedBranchForDelete.name}</span>
                <span className="text-xs text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded font-mono shrink-0">
                  {selectedBranchForDelete.code}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                ⚠️ <strong>Warning:</strong> This action cannot be undone. Any managers, distributors, or team members assigned to this branch will be detached, and the branch will be removed from all dropdown selectors.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <Button
                variant="secondary"
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  setDeleteModalOpen(false);
                  setSelectedBranchForDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                type="button"
                isLoading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(selectedBranchForDelete._id)}
              >
                Yes, Delete Branch
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Branches Modal */}
      {isBulkDeleteModalOpen && (
        <Modal
          isOpen={isBulkDeleteModalOpen}
          onClose={() => setIsBulkDeleteModalOpen(false)}
          title="Confirm Bulk Branch Deletion"
          subtitle="Permanently remove selected operating branches"
          maxWidth="max-w-md"
          icon="⚠️"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-800">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">Permanent Bulk Deletion</p>
                <p>
                  Are you sure you want to permanently delete <strong>{selectedBranchIds.length}</strong> selected branch(es)? Any staff assigned to these branches will be unassigned.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                disabled={bulkDeleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                type="button"
                icon={Trash2}
                isLoading={bulkDeleteMutation.isPending}
                onClick={() => bulkDeleteMutation.mutate(selectedBranchIds)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete {selectedBranchIds.length} Branches
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default BranchManagementPage;
