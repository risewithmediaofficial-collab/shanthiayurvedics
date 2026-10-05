import React, { lazy, Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PhoneCall, Users, CalendarClock, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useBranch } from '../../context/BranchContext.jsx';
import apiClient from '../../api/apiClient.js';
import { Spinner } from '../../components/common/Spinner.jsx';
import { Button } from '../../components/common/Button.jsx';

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

export function TelecallerDashboardView({ previewCaller, onSwitchToManagerView, onSwitchToBossView, returnView }) {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();
  const [activeTab, setActiveTab] = useState('leads');
  const isPreview = user?.role !== 'TELECALLER';
  const callerId = isPreview ? previewCaller?._id || previewCaller?.id : user?.id || user?._id;
  const name = isPreview ? previewCaller?.name : user?.name;
  const { data: summary, isLoading, isError, refetch } = useQuery({
    queryKey: ['caller-workspace', selectedBranchId, callerId],
    enabled: Boolean(callerId),
    queryFn: async ({ signal }) => {
      const [leads, followups, orders] = await Promise.all([
        apiClient.get('/leads', { signal, params: { assignedTo: callerId, limit: 1 } }),
        apiClient.get('/followups', { signal, params: { telecallerId: callerId, limit: 1 } }),
        apiClient.get('/orders', { signal, params: { telecallerId: callerId, limit: 1 } })
      ]);
      return { leads: leads.data.pagination?.total || 0, today: followups.data.stats?.today || 0, overdue: followups.data.stats?.overdue || 0, orders: orders.data.pagination?.total || 0 };
    }
  });
  const back = returnView === 'OWNER' ? onSwitchToBossView : onSwitchToManagerView;
  if (!callerId) return <div className="rounded-xl border bg-white p-8 text-center"><h1 className="text-lg font-semibold">Choose a telecaller from the team directory</h1><p className="mt-2 text-slate-600">Open a team member to view their assigned work.</p>{back && <Button className="mt-4" onClick={back}>Back to team</Button>}</div>;
  const Page = tabs.find((tab) => tab.id === activeTab).Page;
  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Telecaller workspace</p><h1 className="mt-1 text-2xl font-semibold text-slate-900">{isPreview ? `${name || 'Team member'}'s desk` : `Welcome, ${name?.split(' ')[0] || 'there'}`}</h1><p className="mt-2 text-sm text-slate-500">Work through your leads, record call outcomes, and keep every follow-up on track.</p></div>
      {back && <Button variant="secondary" icon={ArrowLeft} onClick={back}>Back to team</Button>}
    </header>
    {isError ? <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">Summary could not be loaded. <button type="button" className="underline font-semibold" onClick={() => refetch()}>Try again</button></div> : <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {[['Assigned leads', 'leads', Users], ["Today's follow-ups", 'today', CalendarClock], ['Overdue follow-ups', 'overdue', PhoneCall], ['Orders', 'orders', ShoppingBag]].map(([label,key,Icon]) => <div key={key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex justify-between gap-2"><p className="text-sm text-slate-600">{label}</p><Icon size={18} className={key === 'overdue' ? 'text-amber-600' : 'text-emerald-700'} /></div><p className="mt-3 text-3xl font-semibold tabular-nums text-slate-900">{isLoading ? '…' : summary?.[key] ?? 0}</p></div>)}
    </div>}
    <nav aria-label="Telecaller modules" className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5">
      {tabs.map(({id,title,icon: Icon}) => <button type="button" key={id} aria-current={activeTab === id ? 'page' : undefined} onClick={() => setActiveTab(id)} className={`flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium flex-1 transition-colors ${activeTab === id ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><Icon size={17} />{title}</button>)}
    </nav>
    <Suspense fallback={<Spinner text="Loading workspace…" className="py-16" />}><Page key={`${activeTab}:${callerId}`} callerId={callerId} /></Suspense>
  </div>;
}
export default TelecallerDashboardView;
