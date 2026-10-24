import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationsRounded from '@mui/icons-material/NotificationsRounded';
import DoneAllRounded from '@mui/icons-material/DoneAllRounded';
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import PhoneIphoneRounded from '@mui/icons-material/PhoneIphoneRounded';
import DeleteSweepRounded from '@mui/icons-material/DeleteSweepRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import { useNotifications } from '../../context/NotificationContext.jsx';
import { Drawer } from '../common/Drawer.jsx';
import { CustomerProfileModal } from '../../features/customers/CustomerProfileModal.jsx';

/**
 * Individual Notification Item with Swipe-to-Right gesture support
 */
function SwipeableNotificationItem({
  notification: n,
  onClear,
  onClick
}) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const isHorizontalSwipeRef = useRef(null);
  const pointerStartRef = useRef({ x: 0, y: 0, active: false });
  const THRESHOLD = 75; // pixels to trigger dismiss

  const isReorder = n.type === 'REORDER_DUE';
  const isLead = n.type === 'LEAD_ASSIGNED';
  const isFollowup = n.type === 'FOLLOW_UP_DUE' || n.type === 'FOLLOW_UP_SCHEDULED';

  const triggerClear = () => {
    setIsExiting(true);
    setOffsetX(350);
    setTimeout(() => {
      onClear(n._id || n.id);
    }, 200);
  };

  // Touch event handlers for mobile / PWA
  const handleTouchStart = (e) => {
    if (isExiting) return;
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    isHorizontalSwipeRef.current = null;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || isExiting) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        isHorizontalSwipeRef.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    if (!isHorizontalSwipeRef.current) return;

    if (deltaX > 0) {
      setOffsetX(Math.min(deltaX, 240));
    } else {
      setOffsetX(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || isExiting) return;
    setIsDragging(false);

    if (offsetX >= THRESHOLD) {
      triggerClear();
    } else {
      setOffsetX(0);
    }
  };

  // Pointer / Mouse drag support for desktop
  const handlePointerDown = (e) => {
    if (isExiting || e.button !== 0) return;
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      active: true
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e) => {
    if (!pointerStartRef.current.active || isExiting) return;
    const deltaX = e.clientX - pointerStartRef.current.x;
    if (deltaX > 0) {
      setOffsetX(Math.min(deltaX, 240));
    } else {
      setOffsetX(0);
    }
  };

  const handlePointerUp = (e) => {
    if (!pointerStartRef.current.active || isExiting) return;
    const deltaX = e.clientX - pointerStartRef.current.x;
    pointerStartRef.current.active = false;
    setIsDragging(false);

    if (deltaX >= THRESHOLD) {
      triggerClear();
    } else {
      setOffsetX(0);
      if (Math.abs(deltaX) < 6) {
        onClick();
      }
    }
  };

  const isTriggered = offsetX >= THRESHOLD;

  return (
    <div className="relative overflow-hidden rounded-xl group select-none transition-all">
      {/* Background Layer Revealed on Swipe to Right */}
      <div
        className={`absolute inset-0 rounded-xl flex items-center px-4 transition-colors ${
          isTriggered
            ? 'bg-emerald-600 text-white'
            : 'bg-emerald-500/85 text-white'
        }`}
      >
        <div
          className="flex items-center gap-2 font-bold text-xs transition-transform"
          style={{
            transform: `scale(${isTriggered ? 1.08 : Math.max(0.7, offsetX / THRESHOLD)})`,
            opacity: Math.min(1, offsetX / 30)
          }}
        >
          <DeleteSweepRounded sx={{ fontSize: 20 }} />
          <span>{isTriggered ? 'Release to Clear' : 'Swipe to Clear'}</span>
        </div>
      </div>

      {/* Foreground Notification Card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          transform: `translateX(${offsetX}px)`,
          opacity: isExiting ? 0 : Math.max(0.3, 1 - offsetX / 300),
          transition: isDragging
            ? 'none'
            : 'transform 200ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 180ms ease-out'
        }}
        className={`relative p-3.5 rounded-xl border transition-colors cursor-pointer touch-pan-y ${
          n.isRead
            ? 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
            : isReorder
            ? 'bg-amber-50/70 border-amber-300 text-slate-900 shadow-xs ring-1 ring-amber-400/30'
            : isLead
            ? 'bg-blue-50/70 border-blue-200 text-slate-900 shadow-xs ring-1 ring-blue-300/30'
            : 'bg-emerald-50/50 border-emerald-200/80 text-slate-900 shadow-xs'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 flex-1 min-w-0 pr-1">
            <span className="truncate">{n.title}</span>
            {isReorder && (
              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-black shrink-0">
                REORDER
              </span>
            )}
            {isLead && (
              <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[9px] font-black shrink-0">
                NEW LEAD
              </span>
            )}
          </h4>
          <div className="flex items-center gap-1 shrink-0">
            {!n.isRead && (
              <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1" />
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerClear();
              }}
              className="p-1 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100 sm:block hidden cursor-pointer"
              title="Clear notification"
            >
              <CloseRounded sx={{ fontSize: 15 }} />
            </button>
          </div>
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
    </div>
  );
}

export function NotificationBell() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    pushStatus
  } = useNotifications();

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCustomerForProfile, setSelectedCustomerForProfile] = useState(null);

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = typeof window !== 'undefined' && (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches);
  const isIOSWithoutPWA = isIOS && !isStandalone;

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
          safeNotifications.length > 0 && (
            <div className="w-full flex items-center justify-between gap-2">
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-emerald-50 transition-colors"
                >
                  <DoneAllRounded sx={{ fontSize: 16 }} /> Mark all as read
                </button>
              ) : (
                <span className="text-xs text-slate-400">All notifications read</span>
              )}
              <button
                type="button"
                onClick={clearAllNotifications}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 flex items-center gap-1.5 cursor-pointer py-1.5 px-3 rounded-lg border border-rose-200 transition-colors shadow-2xs"
                title="Clear all notifications"
              >
                <DeleteSweepRounded sx={{ fontSize: 16 }} /> Clear All
              </button>
            </div>
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
          {pushStatus?.permission === 'denied' && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-medium">
              ⚠️ Notifications are blocked in browser settings. Please allow notifications in site settings to receive instant alerts.
            </div>
          )}

          {/* Action Header Strip (Swipe hint + Clear All button) */}
          {safeNotifications.length > 0 && (
            <div className="flex items-center justify-between gap-2 pb-1 text-xs">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 select-none">
                <ArrowForwardRounded sx={{ fontSize: 13 }} className="text-emerald-600 animate-pulse" />
                <span>Swipe right on any card to clear</span>
              </span>
              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-emerald-50 transition-colors"
                    title="Mark all as read"
                  >
                    <DoneAllRounded sx={{ fontSize: 14 }} />
                    <span className="hidden sm:inline">Mark read</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearAllNotifications}
                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50/80 hover:bg-rose-100 flex items-center gap-1 cursor-pointer py-1 px-2.5 rounded-lg border border-rose-200/60 transition-colors shadow-2xs"
                  title="Clear all notifications"
                >
                  <DeleteSweepRounded sx={{ fontSize: 15 }} />
                  <span>Clear All</span>
                </button>
              </div>
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
                <SwipeableNotificationItem
                  key={n._id || n.id}
                  notification={n}
                  onClear={clearNotification}
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
                />
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
