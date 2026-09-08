import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/apiClient.js';
import { usePermissions } from '../../hooks/usePermissions.js';
import { useBranch } from '../../context/BranchContext.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';
import { ManagerDashboardView } from './ManagerDashboardView.jsx';
import { AdminDistributorDashboardView } from './AdminDistributorDashboardView.jsx';
import { TelecallerDashboardView } from './TelecallerDashboardView.jsx';

export function DashboardHub() {
  const { role, isOwner, isDistributor, isManager, isTelecaller } = usePermissions();
  const { selectedBranchId } = useBranch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [previewCaller, setPreviewCaller] = useState(null);

  // URL parameters (reactive)
  const urlView = searchParams.get('view')?.toUpperCase();
  const callerParam = searchParams.get('caller');
  const fromParam = searchParams.get('from')?.toUpperCase();

  // Determine active view:
  //   - URL param wins if set
  //   - Otherwise, telecallers go to TELECALLER view by default
  //   - Everyone else gets MANAGER view by default
  const activeView = urlView || (isTelecaller ? 'TELECALLER' : 'MANAGER');

  // Effective caller: either local state or URL param
  const effectiveCaller = previewCaller || (callerParam ? { name: callerParam } : null);

  const setView = (newView, caller = null, returnTo = null) => {
    setPreviewCaller(caller);
    const params = {};

    // Only record view param if it's not the default for this role
    const defaultView = isTelecaller ? 'TELECALLER' : 'MANAGER';
    if (newView !== defaultView) {
      params.view = newView.toLowerCase();
    }

    if (newView === 'TELECALLER') {
      if (caller?.name) params.caller = caller.name;
      else if (callerParam) params.caller = callerParam;

      const origin = returnTo || (activeView === 'BOSS' || activeView === 'DISTRIBUTOR' ? 'boss' : 'manager');
      params.from = origin.toLowerCase();
      // Keep tab as team so when returning, user is back on team tab
      params.tab = searchParams.get('tab') || 'team';
    } else {
      // Returning to Manager or Boss view: keep active tab
      if (searchParams.get('tab')) params.tab = searchParams.get('tab');
      else params.tab = 'team';
    }

    setSearchParams(params, { replace: true });
  };

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

  const canSwitchToBoss = isOwner || isDistributor;

  // TELECALLER VIEW — direct login or supervisor preview (Manager / Boss)
  if (activeView === 'TELECALLER') {
    const isSupervisor = !isTelecaller || Boolean(effectiveCaller) || Boolean(fromParam);
    return (
      <TelecallerDashboardView
        previewCaller={effectiveCaller}
        returnView={fromParam || (isOwner || isDistributor ? 'BOSS' : 'MANAGER')}
        onSwitchToManagerView={
          isSupervisor
            ? () => setView('MANAGER')
            : undefined
        }
        onSwitchToBossView={
          isSupervisor && canSwitchToBoss
            ? () => setView('BOSS')
            : undefined
        }
      />
    );
  }

  // BOSS / DISTRIBUTOR VIEW
  if (activeView === 'BOSS' || activeView === 'DISTRIBUTOR') {
    return (
      <AdminDistributorDashboardView
        onSwitchToManagerView={() => setView('MANAGER')}
        onSwitchToTelecaller={(caller) => setView('TELECALLER', caller, 'BOSS')}
      />
    );
  }

  // MANAGER VIEW (default for manager, owner, distributor roles)
  return (
    <ManagerDashboardView
      onSwitchToBossView={
        canSwitchToBoss
          ? () => setView('BOSS')
          : undefined
      }
      onSwitchToTelecaller={(caller) => setView('TELECALLER', caller, 'MANAGER')}
    />
  );
}

export default DashboardHub;
