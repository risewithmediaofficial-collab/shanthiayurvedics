import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  CalendarClock,
  Package,
  Truck,
  RotateCcw,
  AlertTriangle,
  PhoneCall,
  CheckCircle2,
  Building,
  BarChart2,
  LayoutDashboard,
  Shield
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { usePermissions } from '../../hooks/usePermissions.js';
import { useBranch } from '../../context/BranchContext.jsx';
import { Card } from '../../components/common/Card.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';
import { ManagerDashboardView } from './ManagerDashboardView.jsx';
import { AdminDistributorDashboardView } from './AdminDistributorDashboardView.jsx';

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
    return <Spinner size="lg" text="Loading dashboard metrics..." className="py-24" />;
  }

  // 1. Telecaller Console View
  if (isTelecaller) {
    const kpis = dashboardData?.kpis || {};
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-ayur-900 to-slate-900 text-white p-6 rounded-2xl shadow-card">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-ayur-600/30 text-ayur-300 border border-ayur-500/30">
            Telecaller Console
          </span>
          <h2 className="text-2xl font-black tracking-tight text-white mt-1">
            Calling Queue & Customer Outreach
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4.5 bg-gradient-to-br from-white to-ayur-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">New Assigned Leads</span>
              <div className="p-2 rounded-xl bg-ayur-100 text-ayur-800"><Users className="w-5 h-5" /></div>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">{kpis.newAssignedLeads || 0}</div>
            <p className="text-[11px] text-slate-500 mt-1">Ready for calling</p>
          </Card>

          <Card className="p-4.5 bg-gradient-to-br from-white to-amber-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Follow-ups</span>
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800"><CalendarClock className="w-5 h-5" /></div>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">{kpis.todayFollowups || 0}</div>
            <p className="text-[11px] text-amber-700 font-medium mt-1">{kpis.overdueFollowups || 0} overdue tasks</p>
          </Card>

          <Card className="p-4.5 bg-gradient-to-br from-white to-blue-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Calls</span>
              <div className="p-2 rounded-xl bg-blue-100 text-blue-800"><PhoneCall className="w-5 h-5" /></div>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">{kpis.todayCalls || 0}</div>
            <p className="text-[11px] text-slate-500 mt-1">Logged communication</p>
          </Card>

          <Card className="p-4.5 bg-gradient-to-br from-white to-emerald-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Orders & Sales</span>
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800"><ShoppingBag className="w-5 h-5" /></div>
            </div>
            <div className="text-2xl font-black text-emerald-800 mt-2">₹{(kpis.todaySales || 0).toLocaleString()}</div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">{kpis.ordersCount || 0} orders placed</p>
          </Card>
        </div>
      </div>
    );
  }

  // 2. Manager Console View
  if (role === 'MANAGER' || viewMode === 'MANAGER') {
    return (
      <ManagerDashboardView
        onSwitchToBossView={isOwner || role === 'DISTRIBUTOR' ? () => setViewMode('DISTRIBUTOR') : undefined}
      />
    );
  }

  // 3. Admin / Owner / Distributor Master Console View
  return (
    <AdminDistributorDashboardView
      onSwitchToManagerView={() => setViewMode('MANAGER')}
    />
  );
}

export default DashboardHub;
