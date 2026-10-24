import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationsRounded from '@mui/icons-material/NotificationsRounded';
import NotificationsActiveRounded from '@mui/icons-material/NotificationsActiveRounded';
import DoneAllRounded from '@mui/icons-material/DoneAllRounded';
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import SendRounded from '@mui/icons-material/SendRounded';
import PhoneIphoneRounded from '@mui/icons-material/PhoneIphoneRounded';
import { useNotifications } from '../../context/NotificationContext.jsx';
import { Drawer } from '../common/Drawer.jsx';
import { CustomerProfileModal } from '../../features/customers/CustomerProfileModal.jsx';

export function NotificationBell() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    pushStatus,
    enablePushNotifications,
    disablePushNotifications,
    testPushNotification
  } = useNotifications();

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCustomerForProfile, setSelectedCustomerForProfile] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [pushActionLoading, setPushActionLoading] = useState(false);

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = typeof window !== 'undefined' && (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches);
  const isIOSWithoutPWA = isIOS && !isStandalone;

  const handleEnablePush = async () => {
    setPushActionLoading(true);
    setTestResult(null);
    try {
      const res = await enablePushNotifications();
      if (!res.success) {
        setTestResult({ error: res.reason || 'Could not enable push notifications' });
      } else {
        setTestResult({ success: 'Web Push notifications active!' });
      }
    } catch (err) {
      setTestResult({ error: err.message });
    } finally {
      setPushActionLoading(false);
    }
  };

  const handleTestPush = async () => {
    setPushActionLoading(true);
    setTestResult(null);
    try {
      const res = await testPushNotification();
      if (res?.success) {
        setTestResult({ success: '✅ Test alert sent! Native banner displayed.' });
      } else {
        setTestResult({ error: res?.message || 'Failed to dispatch test push' });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setTestResult({ error: msg });
    } finally {
      setPushActionLoading(false);
    }
  };

  const handleDisablePush = async () => {
    setPushActionLoading(true);
    setTestResult(null);
    try {
      await disablePushNotifications();
      setTestResult({ success: 'Push notifications disabled' });
    } catch (err) {
      setTestResult({ error: err.message });
    } finally {
      setPushActionLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative p-1.5 sm:p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none cursor-pointer"
        title="Notifications & Web Push"
      >
        <NotificationsRounded sx={{ fontSize: 22 }} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 flex items-center justify-center min-w-3.5 h-3.5 sm:min-w-4 sm:h-4 px-0.5 text-[9px] sm:text-[10px] font-bold text-white bg-rose-500 rounded-full ring-1 sm:ring-2 ring-white font-mono">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <Drawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Notifications"
        subtitle={`You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`}
        icon={<NotificationsRounded sx={{ fontSize: 22 }} />}
        footer={
          unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              <DoneAllRounded sx={{ fontSize: 16 }} /> Mark all as read
            </button>
          )
        }
      >
        <div className="space-y-3">
          {/* iOS Safari Guidance Note */}
          {isIOSWithoutPWA && (
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
              <PhoneIphoneRounded sx={{ fontSize: 16 }} />
              <span>To receive push alerts on iPhone, tap <strong>Share</strong> then <strong>Add to Home Screen</strong>.</span>
            </div>
          )}

          {/* Unobtrusive Permission Denied Alert */}
          {pushStatus.permission === 'denied' && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-medium">
              ⚠️ Notifications are blocked in browser settings. Please allow notifications in site settings to receive instant alerts.
            </div>
          )}


          {/* Notifications List */}
          {safeNotifications.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm flex flex-col items-center justify-center gap-2.5">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 shadow-xs">
                <NotificationsRounded sx={{ fontSize: 26 }} />
              </div>
              <p className="font-semibold text-slate-700 mt-1">No notifications yet</p>
              <p className="text-xs text-slate-400 max-w-[220px]">
                You're all caught up! New assigned leads, follow-up alerts, and reorder reminders will appear here.
              </p>
            </div>
          ) : (
            safeNotifications.map((n) => {
              const isReorder = n.type === 'REORDER_DUE';
              const isLead = n.type === 'LEAD_ASSIGNED';
              const isFollowup = n.type === 'FOLLOW_UP_DUE' || n.type === 'FOLLOW_UP_SCHEDULED';

              return (
                <div
                  key={n._id || n.id}
                  onClick={() => {
                    if (!n.isRead) markAsRead(n._id || n.id);
                    if (isReorder || n.data?.customerId) {
                      setSelectedCustomerForProfile({
                        customerId: n.data?.customerId,
                        phone: n.data?.mobile,
                        name: n.data?.patientName
                      });
                      setIsOpen(false);
                    } else if (isLead && n.data?.leadId) {
                      navigate(`/leads?search=${encodeURIComponent(n.data.mobile || n.data.name || '')}`);
                      setIsOpen(false);
                    } else if (isFollowup) {
                      navigate('/followups');
                      setIsOpen(false);
                    } else if (n.data?.orderId) {
                      navigate(`/orders/${n.data.orderId}`);
                      setIsOpen(false);
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    n.isRead
                      ? 'bg-white border-slate-100 text-slate-600'
                      : isReorder
                      ? 'bg-amber-50/70 border-amber-300 text-slate-900 shadow-xs ring-1 ring-amber-400/30'
                      : isLead
                      ? 'bg-blue-50/70 border-blue-200 text-slate-900 shadow-xs ring-1 ring-blue-300/30'
                      : 'bg-emerald-50/50 border-emerald-200/80 text-slate-900 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <span>{n.title}</span>
                      {isReorder && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-black">
                          REORDER
                        </span>
                      )}
                      {isLead && (
                        <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[9px] font-black">
                          NEW LEAD
                        </span>
                      )}
                    </h4>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                  <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400 font-mono">
                    <div className="flex items-center gap-1">
                      <AccessTimeRounded sx={{ fontSize: 13 }} />
                      <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {isReorder && (
                      <span className="text-emerald-700 font-bold hover:underline">
                        Customer Profile ➔
                      </span>
                    )}
                    {isLead && (
                      <span className="text-blue-700 font-bold hover:underline">
                        Open Lead ➔
                      </span>
                    )}
                    {isFollowup && (
                      <span className="text-emerald-700 font-bold hover:underline">
                        Open Follow-ups ➔
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Drawer>

      {/* Customer Profile Modal on notification click */}
      {selectedCustomerForProfile && (
        <CustomerProfileModal
          isOpen={Boolean(selectedCustomerForProfile)}
          onClose={() => setSelectedCustomerForProfile(null)}
          customerId={selectedCustomerForProfile.customerId}
          customerPhone={selectedCustomerForProfile.phone}
          initialData={selectedCustomerForProfile}
        />
      )}
    </>
  );
}

export default NotificationBell;
