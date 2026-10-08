import React, { lazy, Suspense, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PhoneCall, Users, CalendarClock, ShoppingBag, ArrowLeft, Plus, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useBranch } from '../../context/BranchContext.jsx';
import apiClient from '../../api/apiClient.js';
import { Spinner } from '../../components/common/Spinner.jsx';
import { Button } from '../../components/common/Button.jsx';
import { OrderCreateModal } from '../orders/OrderCreateModal.jsx';

const LeadListPage = lazy(() => import('../leads/LeadListPage.jsx'));
const FollowUpListPage = lazy(() => import('../followups/FollowUpListPage.jsx'));
const CallHistoryPage = lazy(() => import('../leads/CallHistoryPage.jsx'));
const OrderListPage = lazy(() => import('../orders/OrderListPage.jsx'));

const tabs = [
  { id: 'leads', title: 'Assigned leads', icon: Users, Page: LeadListPage },
  { id: 'followups', title: 'Follow-ups', icon: CalendarClock, Page: FollowUpListPage },
  { id: 'calls', title: 'Call history', icon: PhoneCall, Page: CallHistoryPage },
  { id: 'orders', title: 'Orders', icon: ShoppingBag, Page: OrderListPage }
];

export function TelecallerDashboardView({ previewCaller, onSwitchToManagerView, onSwitchToBossView, onSwitchToDistributorView, returnView }) {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('leads');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const isPreview = user?.role !== 'TELECALLER';

  // Fetch list of telecallers when supervisor/owner/distributor is previewing
  const { data: telecallersList = [], isLoading: isLoadingTelecallers } = useQuery({
    queryKey: ['telecaller-users-list', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/users', { params: { role: 'TELECALLER', limit: 100 } });
      const list = res.data?.data;
      return Array.isArray(list) ? list : [];
    },
    enabled: isPreview
  });

  // Resolve active telecaller reliably by ID, URL param, Name, or directory fallback
  const activeCaller = useMemo(() => {
    if (!isPreview) return user;

    const callerIdFromParam = searchParams.get('callerId');
    const callerNameFromParam = searchParams.get('caller');
    const previewId = previewCaller?._id || previewCaller?.id;
    const previewName = previewCaller?.name;

    // 1. Match by ID
    const targetId = previewId || callerIdFromParam;
    if (targetId) {
      const match = telecallersList.find((tc) => String(tc._id || tc.id) === String(targetId));
      if (match) return match;
      if (previewCaller && (previewCaller._id || previewCaller.id)) return previewCaller;
      return { _id: targetId, id: targetId, name: previewName || callerNameFromParam || 'Telecaller' };
    }

    // 2. Match by Name (case-insensitive substring)
    const targetName = previewName || callerNameFromParam;
    if (targetName && telecallersList.length > 0) {
      const cleanTarget = targetName.trim().toLowerCase();
      const match = telecallersList.find((tc) => {
        const n = (tc.name || '').trim().toLowerCase();
        return n === cleanTarget || n.includes(cleanTarget) || cleanTarget.includes(n);
      });
      if (match) return match;
    }

    // 3. Fallback to first available telecaller
    if (telecallersList.length > 0) {
      return telecallersList[0];
    }

    return previewCaller || (isPreview ? { _id: null, id: null, name: `${user?.name || 'Supervisor'} (Overview Desk)` } : null);
  }, [isPreview, user, previewCaller, searchParams, telecallersList]);

  const callerId = activeCaller?._id || activeCaller?.id || null;
  const callerName = activeCaller?.name || (isPreview ? 'Telecaller' : user?.name);

  const handleSwitchCaller = (newCallerId) => {
    const selected = telecallersList.find((tc) => String(tc._id || tc.id) === String(newCallerId));
    if (selected) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('callerId', selected._id || selected.id);
        next.set('caller', selected.name);
        return next;
      }, { replace: true });
    }
  };

  const { data: summary, isLoading, isError, refetch } = useQuery({
    queryKey: ['caller-workspace', selectedBranchId, callerId || 'all'],
    queryFn: async ({ signal }) => {
      const leadParams = callerId ? { assignedTo: callerId, limit: 1 } : { limit: 1 };
      const followupParams = callerId ? { telecallerId: callerId, limit: 1 } : { limit: 1 };
      const orderParams = callerId ? { telecallerId: callerId, limit: 1 } : { limit: 1 };
      const [leads, followups, orders] = await Promise.all([
        apiClient.get('/leads', { signal, params: leadParams }),
        apiClient.get('/followups', { signal, params: followupParams }),
        apiClient.get('/orders', { signal, params: orderParams })
      ]);
      return {
        leads: leads.data.pagination?.total || 0,
        today: followups.data.stats?.today || 0,
        overdue: followups.data.stats?.overdue || 0,
        orders: orders.data.pagination?.total || 0
      };
    }
  });

  const back = returnView === 'OWNER'
    ? onSwitchToBossView
    : returnView === 'DISTRIBUTOR'
    ? onSwitchToDistributorView
    : onSwitchToManagerView;

  if (isPreview && isLoadingTelecallers && !activeCaller) {
    return <Spinner text="Loading telecaller workspace…" className="py-20" />;
  }

  if (!activeCaller) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 font-bold text-xl">
          👥
        </div>
        <h2 className="text-lg font-bold text-slate-900">Choose a telecaller from the team directory</h2>
        <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
          No telecaller was selected or available. Open a team member from the directory to review their assigned desk.
        </p>
        {back && (
          <Button className="mt-5" onClick={back} variant="secondary">
            {returnView === 'OWNER'
              ? 'Back to Boss Panel'
              : returnView === 'DISTRIBUTOR'
              ? 'Back to Distributor Panel'
              : 'Back to Manager Panel'}
          </Button>
        )}
      </div>
    );
  }

  const Page = tabs.find((tab) => tab.id === activeTab)?.Page || LeadListPage;

  return (
    <div className="space-y-6">
      {/* Header with identity, switch dropdown, and primary actions */}
      <header className="flex flex-wrap items-start justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Telecaller Workspace
            </span>
            {isPreview && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                <UserCheck className="w-3 h-3" />
                Supervisor Preview Desk
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{isPreview ? `${callerName}'s Desk` : `Welcome, ${callerName?.split(' ')[0] || 'there'}`}</span>
          </h1>
          <p className="text-xs text-slate-500">
            Work through assigned leads, consult patients, schedule follow-ups, and place prescription orders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Telecaller Switcher Dropdown for Supervisor / Owner */}
          {isPreview && telecallersList.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <label htmlFor="caller-switcher" className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                Caller:
              </label>
              <select
                id="caller-switcher"
                value={callerId || ''}
                onChange={(e) => handleSwitchCaller(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
              >
                {telecallersList.map((tc) => (
                  <option key={tc._id || tc.id} value={tc._id || tc.id}>
                    {tc.name} {tc.phone ? `(${tc.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Prominent + New Prescription Order Button */}
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setIsOrderModalOpen(true)}
            id="btn-telecaller-header-new-order"
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2 px-3.5 rounded-xl shadow-xs cursor-pointer"
          >
            New Prescription Order
          </Button>

          {back && (
            <Button variant="secondary" icon={ArrowLeft} onClick={back} className="text-xs rounded-xl">
              {returnView === 'OWNER'
                ? 'Back to Boss Panel'
                : returnView === 'DISTRIBUTOR'
                ? 'Back to Distributor Panel'
                : 'Back to Manager Panel'}
            </Button>
          )}
        </div>
      </header>

      {/* Workspace Metric Cards */}
      {isError ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Summary could not be loaded.{' '}
          <button type="button" className="underline font-semibold" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            ['Assigned leads', 'leads', Users],
            ["Today's follow-ups", 'today', CalendarClock],
            ['Overdue follow-ups', 'overdue', PhoneCall],
            ['Orders', 'orders', ShoppingBag]
          ].map(([label, key, Icon]) => (
            <div key={key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex justify-between gap-2">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">{label}</p>
                <Icon size={18} className={key === 'overdue' ? 'text-amber-600' : 'text-emerald-700'} />
              </div>
              <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-900">
                {isLoading ? '…' : summary?.[key] ?? 0}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Tab Navigation */}
      <nav aria-label="Telecaller modules" className="flex gap-1 overflow-x-auto scrollbar-none rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xs whitespace-nowrap">
        {tabs.map(({ id, title, icon: Icon }) => (
          <button
            type="button"
            key={id}
            aria-current={activeTab === id ? 'page' : undefined}
            onClick={() => setActiveTab(id)}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold shrink-0 sm:flex-1 transition-all cursor-pointer ${
              activeTab === id
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Icon size={16} />
            <span>{title}</span>
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <Suspense fallback={<Spinner text="Loading workspace…" className="py-16" />}>
        <Page key={`${activeTab}:${callerId}`} callerId={callerId} />
      </Suspense>

      {/* Full-Featured Prescription Order Modal */}
      {isOrderModalOpen && (
        <OrderCreateModal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          telecallerId={callerId}
        />
      )}
    </div>
  );
}

export default TelecallerDashboardView;
