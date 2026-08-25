import React, { useState } from 'react';
import { Bell, CheckCheck, Clock } from 'lucide-react';
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
        className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <Drawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Notifications"
        subtitle={`You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`}
        footer={
          unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-xs font-semibold text-ayur-700 hover:text-ayur-800 flex items-center gap-1.5"
            >
              <CheckCheck className="w-4 h-4" /> Mark all as read
            </button>
          )
        }
      >
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No notifications yet.
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
                <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400">
                  <Clock className="w-3 h-3" />
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
