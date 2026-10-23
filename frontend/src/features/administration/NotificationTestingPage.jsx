import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NotificationsActiveRounded from '@mui/icons-material/NotificationsActiveRounded';
import SendRounded from '@mui/icons-material/SendRounded';
import PersonAddRounded from '@mui/icons-material/PersonAddRounded';
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import AutorenewRounded from '@mui/icons-material/AutorenewRounded';
import SpeedRounded from '@mui/icons-material/SpeedRounded';
import DevicesRounded from '@mui/icons-material/DevicesRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import PhoneIphoneRounded from '@mui/icons-material/PhoneIphoneRounded';
import LaptopMacRounded from '@mui/icons-material/LaptopMacRounded';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import apiClient from '../../api/apiClient.js';
import { Card } from '../../components/common/Card.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';

export function NotificationTestingPage() {
  const queryClient = useQueryClient();
  const {
    pushStatus,
    enablePushNotifications,
    disablePushNotifications,
    testPushNotification,
    checkPushStatus
  } = useNotifications();

  // Test form states
  const [leadName, setLeadName] = useState('Ramesh Kumar');
  const [leadPhone, setLeadPhone] = useState('9840123456');

  const [followupName, setFollowupName] = useState('Suresh Sundaram');
  const [followupPhone, setFollowupPhone] = useState('9876543210');
  const [followupNotes, setFollowupNotes] = useState('Call to discuss Ayurvedic pain relief oil course dosage');

  const [reorderName, setReorderName] = useState('Meenakshi Ammal');
  const [reorderPhone, setReorderPhone] = useState('9840998877');

  const [simulationLogs, setSimulationLogs] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  const addLog = (title, status, detail) => {
    const time = new Date().toLocaleTimeString();
    setSimulationLogs((prev) => [
      { id: Date.now(), time, title, status, detail },
      ...prev.slice(0, 19)
    ]);
  };

  // Fetch registered devices / push subscriptions
  const { data: subscriptions = [], refetch: refetchSubscriptions, isLoading: loadingSubscriptions } = useQuery({
    queryKey: ['push-subscriptions'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/notifications/subscriptions');
        return Array.isArray(res.data?.data) ? res.data.data : [];
      } catch (_e) {
        return [];
      }
    }
  });

  // Action 1: Basic Test Push
  const handleTestBasic = async () => {
    setActionLoading(true);
    try {
      const res = await testPushNotification();
      addLog('Test Web Push', 'success', 'Dispatched test push to current device banner');
      await checkPushStatus();
      queryClient.invalidateQueries({ queryKey: ['push-subscriptions'] });
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      addLog('Test Web Push', 'error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Action 2: Trigger 1 - Lead Assigned
  const handleSimulateLeadAssign = async () => {
    setActionLoading(true);
    try {
      const res = await apiClient.post('/notifications/simulate-lead-assign', {
        name: leadName,
        mobile: leadPhone
      });
      addLog('Trigger 1: Lead Assigned', 'success', `Simulated assignment of "${leadName}" (${leadPhone})`);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (err) {
      addLog('Trigger 1: Lead Assigned', 'error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Action 3: Trigger 2 - Follow-up Due
  const handleSimulateFollowupDue = async () => {
    setActionLoading(true);
    try {
      const res = await apiClient.post('/notifications/simulate-followup-due', {
        name: followupName,
        mobile: followupPhone,
        notes: followupNotes
      });
      addLog('Trigger 2: Follow-up Due', 'success', `Simulated follow-up due alert for "${followupName}"`);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (err) {
      addLog('Trigger 2: Follow-up Due', 'error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Action 4: Trigger 3 - Reorder Due (3x Daily)
  const handleSimulateReorderDue = async () => {
    setActionLoading(true);
    try {
      const res = await apiClient.post('/notifications/simulate-reorder-due', {
        name: reorderName,
        mobile: reorderPhone
      });
      addLog('Trigger 3: Reorder Reminder', 'success', `Simulated 3-day reorder reminder for "${reorderName}"`);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (err) {
      addLog('Trigger 3: Reorder Reminder', 'error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Action 5: Trigger 4 - Run 1-Hour Notification Cycle Now
  const handleTriggerCycle = async () => {
    setActionLoading(true);
    try {
      const res = await apiClient.post('/notifications/trigger-cycle');
      const data = res.data?.data || {};
      addLog(
        'Trigger 4: Hourly Batch Cycle',
        'success',
        `Dispatched ${data.followupsCount ?? 0} due follow-ups and ${data.reordersCount ?? 0} reorder alerts`
      );
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (err) {
      addLog('Trigger 4: Hourly Batch Cycle', 'error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <NotificationsActiveRounded sx={{ fontSize: 20 }} />
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Web Push Notification Testing Hub
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              RFC 8292 / VAPID
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Test and simulate native OS push notifications for lead assignments, scheduled follow-up alerts, and 3x daily treatment reorders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              checkPushStatus();
              refetchSubscriptions();
            }}
            className="flex items-center gap-1.5"
          >
            <RefreshRounded sx={{ fontSize: 16 }} /> Refresh State
          </Button>
          {!pushStatus.isSubscribed ? (
            <Button
              variant="primary"
              size="sm"
              onClick={enablePushNotifications}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              <NotificationsActiveRounded sx={{ fontSize: 16 }} /> Enable Web Push
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={disablePushNotifications}
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              Unsubscribe Device
            </Button>
          )}
        </div>
      </div>

      {/* Helpful Minimization Tip */}
      <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs flex items-center gap-2.5 shadow-2xs">
        <InfoOutlined sx={{ fontSize: 20 }} className="text-blue-600 shrink-0" />
        <div>
          <strong>Testing Tip:</strong> You can minimize your browser or switch to another tab/window. When you click any simulation button, the notification will trigger a <strong>native OS Heads-Up banner</strong> on Windows/macOS/Android, even with tabs in the background!
        </div>
      </div>

      {/* Status Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Browser Support */}
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Browser Support</div>
            <div className="text-base font-extrabold text-slate-900 mt-0.5">
              {pushStatus.isSupported ? 'Supported' : 'Unsupported'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">PushManager & Service Worker</div>
          </div>
          <div className={`p-2.5 rounded-xl ${pushStatus.isSupported ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
            {pushStatus.isSupported ? <CheckCircleRounded sx={{ fontSize: 24 }} /> : <ErrorOutlineRounded sx={{ fontSize: 24 }} />}
          </div>
        </Card>

        {/* Card 2: Permission State */}
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Permission</div>
            <div className="text-base font-extrabold capitalize text-slate-900 mt-0.5">
              {pushStatus.permission}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Browser Notification API</div>
          </div>
          <Badge
            variant={pushStatus.permission === 'granted' ? 'emerald' : pushStatus.permission === 'denied' ? 'rose' : 'amber'}
            size="md"
          >
            {pushStatus.permission.toUpperCase()}
          </Badge>
        </Card>

        {/* Card 3: Subscription State */}
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">This Device</div>
            <div className="text-base font-extrabold text-slate-900 mt-0.5">
              {pushStatus.isSubscribed ? 'Subscribed' : 'Not Subscribed'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Active endpoint registered</div>
          </div>
          <div className={`p-2.5 rounded-xl ${pushStatus.isSubscribed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
            <DevicesRounded sx={{ fontSize: 24 }} />
          </div>
        </Card>

        {/* Card 4: Domain & VAPID */}
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Gateway Domain</div>
            <div className="text-xs font-mono font-bold text-slate-900 mt-0.5 truncate max-w-[150px]">
              shanthiayurvedas.com
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">mailto:admin@shanthiayurvedas.com</div>
          </div>
          <Badge variant="blue" size="md">RFC 8030</Badge>
        </Card>
      </div>

      {/* Main Testing Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Triggers Simulation Console */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Instant Test */}
          <Card title="Quick Basic Test" subtitle="Verify that your browser receives and shows push alerts immediately">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-1">
              <div>
                <p className="text-xs text-slate-600">
                  Sends an immediate test packet signed with your backend's private VAPID key to the push gateway.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Expected Banner: <strong>"🌿 Shanthi Ayurvedas Test Alert"</strong>
                </p>
              </div>
              <Button
                variant="primary"
                onClick={handleTestBasic}
                disabled={actionLoading}
                className="shrink-0 bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5"
              >
                <SendRounded sx={{ fontSize: 16 }} />
                Send Test Push
              </Button>
            </div>
          </Card>

          {/* Trigger 1: Lead Assigned */}
          <Card
            title="Trigger 1: Lead Assigned to Telecaller"
            subtitle="Simulates when manager assigns a new or existing lead to a telecaller"
          >
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Lead Patient Name"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                />
                <Input
                  label="Lead Mobile Number"
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  placeholder="e.g. 9840123456"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span>Notification payload links to: <code className="text-emerald-700 font-mono">/leads?search={leadPhone}</code></span>
                <Button
                  variant="primary"
                  onClick={handleSimulateLeadAssign}
                  disabled={actionLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 text-xs py-1.5"
                >
                  <PersonAddRounded sx={{ fontSize: 16 }} />
                  Simulate Lead Assign
                </Button>
              </div>
            </div>
          </Card>

          {/* Trigger 2: Follow-up / Refollow-up Due */}
          <Card
            title="Trigger 2: Contact Leads & Refollow-Up Due"
            subtitle="Simulates a call outcome where telecaller notes a refollow-up date and it arrives"
          >
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Customer / Lead Name"
                  value={followupName}
                  onChange={(e) => setFollowupName(e.target.value)}
                  placeholder="e.g. Suresh Sundaram"
                />
                <Input
                  label="Mobile Number"
                  value={followupPhone}
                  onChange={(e) => setFollowupPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                />
              </div>

              <Input
                label="Follow-Up Conversation Notes"
                value={followupNotes}
                onChange={(e) => setFollowupNotes(e.target.value)}
                placeholder="Call notes..."
              />

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span>Priority: <span className="font-bold text-amber-700">HIGH</span> • Links to: <code className="text-emerald-700 font-mono">/followups</code></span>
                <Button
                  variant="primary"
                  onClick={handleSimulateFollowupDue}
                  disabled={actionLoading}
                  className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 text-xs py-1.5"
                >
                  <AccessTimeRounded sx={{ fontSize: 16 }} />
                  Simulate Follow-up Due
                </Button>
              </div>
            </div>
          </Card>

          {/* Trigger 3: 15-Day Reorder Reminder */}
          <Card
            title="Trigger 3: Reorder Reminder (Before 3 Days - Daily 3 Times)"
            subtitle="Simulates patient nearing 15-day course completion (Day 12) with daily 3x quota"
          >
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Patient Name"
                  value={reorderName}
                  onChange={(e) => setReorderName(e.target.value)}
                  placeholder="e.g. Meenakshi Ammal"
                />
                <Input
                  label="Patient Mobile"
                  value={reorderPhone}
                  onChange={(e) => setReorderPhone(e.target.value)}
                  placeholder="e.g. 9840998877"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span>Course: <span className="font-bold text-slate-800">15-Day Treatment (Finishes in 3 days)</span> • Daily Cap: <span className="font-bold text-slate-800">3x Daily</span></span>
                <Button
                  variant="primary"
                  onClick={handleSimulateReorderDue}
                  disabled={actionLoading}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 text-xs py-1.5"
                >
                  <AutorenewRounded sx={{ fontSize: 16 }} />
                  Simulate 3-Day Reorder
                </Button>
              </div>
            </div>
          </Card>

          {/* Trigger 4: Run Hourly Cycle Now */}
          <Card
            title="Trigger 4: Force 1-Hour Scheduled Notification Cycle"
            subtitle="Execute the hourly automated background cron job immediately without waiting 1 hour"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-600">
                  Scans all pending follow-ups due right now, checks orders nearing 15-day completion, and dispatches simultaneously.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Normally runs automatically at <code className="font-mono text-slate-700">0 * * * *</code> (every hour on the hour).
                </p>
              </div>
              <Button
                variant="primary"
                onClick={handleTriggerCycle}
                disabled={actionLoading}
                className="shrink-0 bg-purple-700 hover:bg-purple-800 text-white flex items-center gap-1.5"
              >
                <SpeedRounded sx={{ fontSize: 16 }} />
                Execute Hourly Cycle
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column: Registered Devices & Simulation Live Logs */}
        <div className="space-y-6">
          {/* Registered Devices List */}
          <Card
            title="Your Subscribed Devices"
            subtitle={`${subscriptions.length} active device${subscriptions.length === 1 ? '' : 's'}`}
          >
            {subscriptions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No push devices registered for this user account yet. Click <strong>"Enable Web Push"</strong> above to register this browser.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {subscriptions.map((sub, idx) => {
                  const isMobile = /Android|iPhone|iPad/i.test(sub.userAgent || '');
                  return (
                    <div
                      key={sub._id || sub.endpoint || idx}
                      className="p-2.5 rounded-lg border border-slate-200 bg-white shadow-2xs text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          {isMobile ? <PhoneIphoneRounded sx={{ fontSize: 16 }} /> : <LaptopMacRounded sx={{ fontSize: 16 }} />}
                          <span className="truncate max-w-[140px]">{sub.userAgent ? sub.userAgent.split(' ')[0] : 'Browser Device'}</span>
                        </div>
                        <Badge variant="emerald" size="sm">ACTIVE</Badge>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        ...{sub.endpoint.slice(-30)}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
                        <span>Added: {new Date(sub.createdAt).toLocaleDateString()}</span>
                        <span>{sub.lastUsedAt ? `Used: ${new Date(sub.lastUsedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Ready'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Real-time Simulation Logs */}
          <Card title="Simulation Activity Log" subtitle="Live feed of test alerts dispatched">
            {simulationLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Click any simulation button on the left to see live dispatch results and confirmation logs here.
              </div>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {simulationLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-2 rounded-lg border text-xs space-y-0.5 ${
                      log.status === 'success'
                        ? 'bg-emerald-50/70 border-emerald-200 text-slate-800'
                        : 'bg-rose-50/70 border-rose-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-[11px]">
                      <span>{log.title}</span>
                      <span className="text-[10px] font-mono text-slate-400">{log.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-600">{log.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default NotificationTestingPage;
