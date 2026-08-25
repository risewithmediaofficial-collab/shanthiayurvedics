import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Check, Lock } from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Card } from '../../components/common/Card.jsx';
import { Badge } from '../../components/common/Badge.jsx';

export function RolesManagementPage() {
  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await apiClient.get('/roles');
      return res.data?.data || [];
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Role-Based Access Control (RBAC)</h2>
        <p className="text-xs text-slate-500">
          Strict permission policies enforced on every backend API endpoint and database query
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(rolesData || []).map((role) => (
          <Card key={role._id} className="p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-ayur-600" />
                  {role.displayName || role.name}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{role.description}</p>
              </div>
              <Badge variant="primary" size="sm">
                {role.permissions?.length || 0} permissions
              </Badge>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Active Permissions
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                {role.permissions?.map((perm, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono"
                  >
                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default RolesManagementPage;
