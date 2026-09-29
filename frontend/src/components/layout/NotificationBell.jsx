import React, { useState } from 'react';
import NotificationsRounded from '@mui/icons-material/NotificationsRounded';
import DoneAllRounded from '@mui/icons-material/DoneAllRounded';
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import { useNotifications } from '../../context/NotificationContext.jsx';
import { Drawer } from '../common/Drawer.jsx';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none cursor-pointer"
        title="Notifications"
      >
        <NotificationsRounded sx={{ fontSize: 22 }} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full ring-2 ring-white font-mono">
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
          {notifications.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm flex flex-col items-center justify-center gap-2.5">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 shadow-xs">
                <NotificationsRounded sx={{ fontSize: 26 }} />
              </div>
              <p className="font-semibold text-slate-700 mt-1">No notifications yet</p>
              <p className="text-xs text-slate-400 max-w-[220px]">
                You're all caught up! New orders, status updates, and alerts will appear here.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n._id || n.id}
                onClick={() => !n.isRead && markAsRead(n._id || n.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  n.isRead
                    ? 'bg-white border-slate-100 text-slate-600'
                    : 'bg-ayur-50/50 border-ayur-200/80 text-slate-900 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-semibold text-slate-800">{n.title}</h4>
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-ayur-600 shrink-0 mt-1" />
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400 font-mono">
                  <AccessTimeRounded sx={{ fontSize: 13 }} />
                  <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </Drawer>
    </>
  );
}

export default NotificationBell;
