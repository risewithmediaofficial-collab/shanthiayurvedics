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

  // Derive view from URL (reactive — picked up on every render)
  const urlView = searchParams.get('view')?.toUpperCase();

  // Determine the active view:
  //   - URL param wins if set
  //   - Otherwise, telecallers go to TELECALLER view by default
  //   - Everyone else gets MANAGER view by default
  const activeView = urlView || (isTelecaller ? 'TELECALLER' : 'MANAGER');

  const setView = (newView, caller = null) => {
    setPreviewCaller(caller);
    const params = {};
    if (searchParams.get('tab')) params.tab = searchParams.get('tab');
    // Only record view param if it's not the default for this role
    const defaultView = isTelecaller ? 'TELECALLER' : 'MANAGER';
    if (newView !== defaultView) params.view = newView.toLowerCase();
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

  // TELECALLER VIEW — direct login or manager preview
  if (activeView === 'TELECALLER') {
    return (
      <TelecallerDashboardView
        previewCaller={previewCaller}
        onSwitchToManagerView={
          !isTelecaller || previewCaller
            ? () => setView('MANAGER')
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
        onSwitchToTelecaller={(caller) => setView('TELECALLER', caller)}
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
      onSwitchToTelecaller={(caller) => setView('TELECALLER', caller)}
    />
  );
}

export default DashboardHub;
