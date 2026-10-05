import React, { lazy, Suspense, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/apiClient.js';
import { usePermissions } from '../../hooks/usePermissions.js';
import { useBranch } from '../../context/BranchContext.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';
const ManagerDashboardView = lazy(() => import('./ManagerDashboardView.jsx'));
const AdminDistributorDashboardView = lazy(() => import('./AdminDistributorDashboardView.jsx'));
const TelecallerDashboardView = lazy(() => import('./TelecallerDashboardView.jsx'));
const DistributorStockDashboardView = lazy(() => import('./DistributorStockDashboardView.jsx'));

const DashboardLoading = () => <Spinner size="lg" text="Loading dashboard..." className="py-24" />;

export function DashboardHub() {
  const { role, isOwner, isDistributor, isManager, isTelecaller, user } = usePermissions();
  const { selectedBranchId } = useBranch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [previewCaller, setPreviewCaller] = useState(null);

  // URL parameters (reactive)
  const urlView = searchParams.get('view')?.toUpperCase();
  const callerParam = searchParams.get('caller');
  const fromParam = searchParams.get('from')?.toUpperCase();

  // Determine role-specific default view:
  const getRoleDefaultView = () => {
    if (isOwner) return 'OWNER';
    if (isDistributor) return 'DISTRIBUTOR';
    if (isTelecaller) return 'TELECALLER';
    return 'MANAGER';
  };

  const allowedViews = isOwner ? ['OWNER', 'BOSS', 'MANAGER', 'DISTRIBUTOR', 'TELECALLER'] : isTelecaller ? ['TELECALLER'] : isDistributor ? ['DISTRIBUTOR'] : ['MANAGER', 'TELECALLER'];
  const activeView = allowedViews.includes(urlView) ? urlView : getRoleDefaultView();

  // Effective caller: either local state or URL param
  const callerIdParam = searchParams.get('callerId');
  const effectiveCaller = isTelecaller
    ? null
    : previewCaller || (callerParam || callerIdParam ? { name: callerParam || '', _id: callerIdParam || null, id: callerIdParam || null } : null);

  const setView = (newView, caller = null, returnTo = null) => {
    setPreviewCaller(caller);
    const params = {};

    const defaultView = getRoleDefaultView();
    if (newView !== defaultView) {
      params.view = newView.toLowerCase();
    }

    if (newView === 'TELECALLER') {
      if (caller?._id || caller?.id) params.callerId = caller._id || caller.id;
      if (caller?.name) params.caller = caller.name;
      else if (callerParam) params.caller = callerParam;

      const origin = returnTo || (isOwner ? 'owner' : isDistributor ? 'distributor' : 'manager');
      params.from = origin.toLowerCase();
      params.tab = searchParams.get('tab') || 'team';
    } else {
      if (searchParams.get('tab')) params.tab = searchParams.get('tab');
      else params.tab = 'overview';
    }

    setSearchParams(params, { replace: true });
  };

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', selectedBranchId, role],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard');
      return res.data?.data;
    },
    enabled: Boolean(user)
  });

  if (isLoading) {
    return <Spinner size="lg" text="Loading role dashboard..." className="py-24" />;
  }

  // 1. TELECALLER VIEW
  if (activeView === 'TELECALLER') {
    const isSupervisor = !isTelecaller;
    return (
      <Suspense fallback={<DashboardLoading />}><TelecallerDashboardView
        previewCaller={effectiveCaller}
        returnView={fromParam || (isOwner ? 'OWNER' : isDistributor ? 'DISTRIBUTOR' : 'MANAGER')}
        onSwitchToManagerView={
          isSupervisor
            ? () => setView('MANAGER')
            : undefined
        }
        onSwitchToBossView={
          isSupervisor && isOwner
            ? () => setView('OWNER')
            : undefined
        }
      /></Suspense>
    );
  }

  // 2. DISTRIBUTOR VIEW (Dedicated Branch Stock & Inventory Portal)
  if (activeView === 'DISTRIBUTOR') {
    return (
      <Suspense fallback={<DashboardLoading />}><DistributorStockDashboardView
        onSwitchToManagerView={
          isOwner
            ? () => setView('MANAGER')
            : undefined
        }
      /></Suspense>
    );
  }

  // 3. OWNER / BOSS VIEW (Master Enterprise Multi-Branch Desk)
  if (activeView === 'OWNER' || activeView === 'BOSS') {
    return (
      <Suspense fallback={<DashboardLoading />}><AdminDistributorDashboardView
        onSwitchToManagerView={() => setView('MANAGER')}
        onSwitchToTelecaller={(caller) => setView('TELECALLER', caller, 'OWNER')}
      /></Suspense>
    );
  }

  // 4. MANAGER VIEW (Default for Managers: Branch Operations & Team Callers)
  return (
    <Suspense fallback={<DashboardLoading />}><ManagerDashboardView
      onSwitchToBossView={
        isOwner
          ? () => setView('OWNER')
          : undefined
      }
      onSwitchToTelecaller={(caller) => setView('TELECALLER', caller, 'MANAGER')}
    /></Suspense>
  );
}

export default DashboardHub;
