import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Check, Save, RefreshCw, ChevronDown, ChevronUp, Lock, Info } from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Card } from '../../components/common/Card.jsx';
import { Button } from '../../components/common/Button.jsx';

const PERMISSION_GROUPS = {
  'Leads': [
    { code: 'leads.view', label: 'View Leads' },
    { code: 'leads.create', label: 'Create Leads' },
    { code: 'leads.edit', label: 'Edit Leads' },
    { code: 'leads.assign', label: 'Assign Leads' },
    { code: 'leads.reassign', label: 'Reassign Leads' },
    { code: 'leads.delete', label: 'Delete Leads' }
  ],
  'Follow-ups': [
    { code: 'followups.view', label: 'View Follow-ups' },
    { code: 'followups.create', label: 'Create Follow-ups' },
    { code: 'followups.edit', label: 'Edit Follow-ups' },
    { code: 'followups.complete', label: 'Complete Follow-ups' }
  ],
  'Customers': [
    { code: 'customers.view', label: 'View Customers' },
    { code: 'customers.create', label: 'Create Customers' },
    { code: 'customers.edit', label: 'Edit Customers' }
  ],
  'Orders': [
    { code: 'orders.view', label: 'View Orders' },
    { code: 'orders.create', label: 'Create Orders' },
    { code: 'orders.edit', label: 'Edit Orders' },
    { code: 'orders.delete', label: 'Delete Orders' },
    { code: 'orders.verify', label: 'Verify Orders' },
    { code: 'orders.process', label: 'Process Orders' },
    { code: 'orders.pack', label: 'Pack Orders' },
    { code: 'orders.dispatch', label: 'Dispatch Orders' },
    { code: 'orders.cancel', label: 'Cancel Orders' }
  ],
  'Products and Inventory': [
    { code: 'products.view', label: 'View Products' },
    { code: 'products.create', label: 'Create Products' },
    { code: 'products.edit', label: 'Edit Products' },
    { code: 'inventory.view', label: 'View Inventory' },
    { code: 'inventory.manage', label: 'Manage Inventory' },
    { code: 'inventory.adjust', label: 'Adjust Stock' },
    { code: 'inventory.transfer', label: 'Transfer Stock' }
  ],
  'Operations and Shipping': [
    { code: 'operations.view', label: 'View Operations' },
    { code: 'shipping.view', label: 'View Shipping' },
    { code: 'shipping.manage', label: 'Manage Shipping' },
    { code: 'delivery.view', label: 'View Deliveries' },
    { code: 'delivery.manage', label: 'Manage Deliveries' }
  ],
  'RTO': [
    { code: 'rto.view', label: 'View RTO' },
    { code: 'rto.manage', label: 'Manage RTO' },
    { code: 'rto.verify', label: 'Verify RTO' }
  ],
  'Reports': [
    { code: 'reports.view', label: 'View Reports' },
    { code: 'reports.export', label: 'Export Reports' }
  ],
  'Administration': [
    { code: 'users.view', label: 'View Users' },
    { code: 'users.create', label: 'Create Users' },
    { code: 'users.edit', label: 'Edit Users' },
    { code: 'users.disable', label: 'Disable Users' },
    { code: 'roles.manage', label: 'Manage Roles' },
    { code: 'permissions.manage', label: 'Manage Permissions' },
    { code: 'branches.manage', label: 'Manage Branches' },
    { code: 'settings.manage', label: 'Manage Settings' },
    { code: 'integrations.manage', label: 'Manage Integrations' },
    { code: 'audit.view', label: 'View Audit Logs' }
  ]
};

const ROLE_META = {
  OWNER: { label: 'Admin / Owner', color: 'bg-violet-100 text-violet-800 border-violet-200', dot: 'bg-violet-500' },
  DISTRIBUTOR: { label: 'Distributor', color: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
  MANAGER: { label: 'Manager', color: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  TELECALLER: { label: 'Telecaller', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' }
};

const ALL_PERM_CODES = Object.values(PERMISSION_GROUPS).flat().map(p => p.code);

function PermToggle({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${enabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
      aria-checked={enabled}
      role="switch"
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function RolePermissionEditor({ role, initialPermissions, onSave, isSaving }) {
  const meta = ROLE_META[role.name] || { label: role.name, color: 'bg-slate-100 text-slate-800', dot: 'bg-slate-500' };
  const isOwner = role.name === 'OWNER';
  const [localPerms, setLocalPerms] = useState(new Set(initialPermissions));
  const [expandedGroups, setExpandedGroups] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setLocalPerms(new Set(initialPermissions));
    setIsDirty(false);
  }, [JSON.stringify(initialPermissions)]);

  const toggle = (code) => {
    if (isOwner) return;
    setLocalPerms(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
    setIsDirty(true);
  };

  const toggleGroup = (perms) => {
    if (isOwner) return;
    const codes = perms.map(p => p.code);
    const allOn = codes.every(c => localPerms.has(c));
    setLocalPerms(prev => {
      const next = new Set(prev);
      codes.forEach(c => allOn ? next.delete(c) : next.add(c));
      return next;
    });
    setIsDirty(true);
  };

  return (
    <Card className="overflow-hidden border border-slate-200 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${meta.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
          {isOwner && (
            <span className="inline-flex items-center gap-1 text-[11px] text-violet-600 font-medium">
              <Lock className="w-3 h-3" /> Full access — not editable
            </span>
          )}
          {!isOwner && (
            <span className="text-[11px] text-slate-400">{localPerms.size} of {ALL_PERM_CODES.length} permissions enabled</span>
          )}
        </div>
        {!isOwner && (
          <div className="flex items-center gap-2">
            {isDirty && (
              <button
                onClick={() => { setLocalPerms(new Set(initialPermissions)); setIsDirty(false); }}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            )}
            <Button
              variant={isDirty ? 'primary' : 'secondary'}
              size="sm"
              icon={Save}
              onClick={() => onSave({ roleName: role.name, permissions: Array.from(localPerms) })}
              isLoading={isSaving}
              disabled={!isDirty}
            >
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {isOwner ? (
        <div className="px-5 py-4">
          <div className="flex flex-wrap gap-1.5">
            {ALL_PERM_CODES.map(code => (
              <span key={code} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-violet-50 text-violet-700 text-[10px] font-mono border border-violet-100">
                <Check className="w-2.5 h-2.5 text-violet-500" />{code}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {Object.entries(PERMISSION_GROUPS).map(([groupName, perms]) => {
            const isExpanded = expandedGroups[groupName] !== false;
            const enabledCount = perms.filter(p => localPerms.has(p.code)).length;
            const allEnabled = enabledCount === perms.length;
            return (
              <div key={groupName}>
                <div
                  className="flex items-center justify-between px-5 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedGroups(prev => ({ ...prev, [groupName]: !isExpanded }))}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-slate-700">{groupName}</span>
                    <span className="text-[10px] text-slate-400">{enabledCount}/{perms.length}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={e => { e.stopPropagation(); toggleGroup(perms); }}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-colors ${allEnabled ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                    >
                      {allEnabled ? 'Remove All' : 'Grant All'}
                    </button>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-5 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4">
                    {perms.map(perm => (
                      <div key={perm.code} className="flex items-center justify-between py-1">
                        <div>
                          <p className="text-xs font-medium text-slate-700">{perm.label}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{perm.code}</p>
                        </div>
                        <PermToggle enabled={localPerms.has(perm.code)} onChange={() => toggle(perm.code)} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function RolesManagementPage() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState('');

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => { const res = await apiClient.get('/roles'); const _rd = res.data?.data; return Array.isArray(_rd) ? _rd : []; }
  });

  const updateMutation = useMutation({
    mutationFn: ({ roleName, permissions }) => apiClient.patch(`/roles/${roleName}`, { permissions }),
    onSuccess: (_, vars) => { queryClient.invalidateQueries({ queryKey: ['roles'] }); showToast(`Permissions saved for ${vars.roleName}`); },
    onError: err => showToast(`Error: ${err.response?.data?.message || 'Failed to update permissions'}`)
  });

  const ROLE_ORDER = ['OWNER', 'MANAGER', 'DISTRIBUTOR', 'TELECALLER'];
  const sorted = [...(rolesData || [])].sort((a, b) => ROLE_ORDER.indexOf(a.name) - ROLE_ORDER.indexOf(b.name));
  const hasOwner = sorted.some(r => r.name === 'OWNER');
  const displayRoles = hasOwner ? sorted : [{ name: 'OWNER', permissions: [], description: 'Full system access' }, ...sorted];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-ayur-600" />
            Role and Permission Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure what each role can access. Admin (Owner) always has full access and cannot be restricted.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <Info className="w-3.5 h-3.5 text-ayur-500 flex-shrink-0" />
          Changes apply on the user's next login
        </div>
      </div>

      {toast && (
        <div className={`px-4 py-2.5 rounded-xl border text-sm font-semibold ${toast.startsWith('Error') ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          {toast}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-40 rounded-xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {displayRoles.map(role => (
            <RolePermissionEditor
              key={role.name}
              role={role}
              initialPermissions={role.permissions || []}
              onSave={updateMutation.mutate}
              isSaving={updateMutation.isPending && updateMutation.variables?.roleName === role.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default RolesManagementPage;
