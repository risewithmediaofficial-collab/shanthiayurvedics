import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  CalendarClock,
  PhoneCall,
  ShoppingBag
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { usePermissions } from '../../hooks/usePermissions.js';
import { useBranch } from '../../context/BranchContext.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';
import { ManagerDashboardView } from './ManagerDashboardView.jsx';
import { AdminDistributorDashboardView } from './AdminDistributorDashboardView.jsx';

const TCStatCard = ({ label, value, sub, icon: Icon, color }) => {
  const colorMap = {
    green:  'bg-emerald-50 border-emerald-100 text-emerald-700',
    amber:  'bg-amber-50 border-amber-100 text-amber-700',
    blue:   'bg-blue-50 border-blue-100 text-blue-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700'
  };
  return (
    <div className={`rounded-2xl border p-5 ${colorMap[color] || colorMap.green}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <div className="text-2xl font-black mt-1.5">{value}</div>
          {sub && <p className="text-xs mt-1 text-slate-400">{sub}</p>}
        </div>
        <div className="p-2 rounded-xl bg-white/70">
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

export function DashboardHub() {
  const { role, isOwner, isManager, isTelecaller } = usePermissions();
  const { selectedBranchId } = useBranch();
  const [viewMode, setViewMode] = useState(
    role === 'MANAGER' ? 'MANAGER' : 'DISTRIBUTOR'
  );

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', selectedBranchId, role],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard');
      return res.data?.data;
    }
  });

  if (isLoading) {
    return <Spinner size="lg" text="Loading dashboard..." className="py-24" />;
  }

  // Telecaller Console
  if (isTelecaller) {
    const kpis = dashboardData?.kpis || {};
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-ayur-700 text-white p-6 rounded-2xl shadow-sm">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 border border-white/20">
            Telecaller Console
          </span>
          <h2 className="text-xl font-black tracking-tight text-white mt-2">
            Calling Queue & Customer Outreach
          </h2>
          <p className="text-sm text-white/70 mt-1">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <TCStatCard
            label="New Assigned Leads"
            value={kpis.newAssignedLeads ?? 0}
            sub="Ready for calling"
            icon={Users}
            color="green"
          />
          <TCStatCard
            label="Today's Follow-ups"
            value={kpis.todayFollowups ?? 0}
            sub={`${kpis.overdueFollowups ?? 0} overdue`}
            icon={CalendarClock}
            color="amber"
          />
          <TCStatCard
            label="Today's Calls"
            value={kpis.todayCalls ?? 0}
            sub="Logged communication"
            icon={PhoneCall}
            color="blue"
          />
          <TCStatCard
            label="Today's Sales"
            value={`₹${(kpis.todaySales ?? 0).toLocaleString()}`}
            sub={`${kpis.ordersCount ?? 0} orders placed`}
            icon={ShoppingBag}
            color="purple"
          />
        </div>
      </div>
    );
  }

  // Manager Console View
  if (role === 'MANAGER' || viewMode === 'MANAGER') {
    return (
      <ManagerDashboardView
        onSwitchToBossView={
          isOwner || role === 'DISTRIBUTOR'
            ? () => setViewMode('DISTRIBUTOR')
            : undefined
        }
      />
    );
  }

  // Admin / Owner / Distributor Master Console
  return (
    <AdminDistributorDashboardView
      onSwitchToManagerView={() => setViewMode('MANAGER')}
    />
  );
}

export default DashboardHub;
