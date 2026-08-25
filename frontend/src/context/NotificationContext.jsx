import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient.js';
import { getSocket } from '../api/socketClient.js';
import { useAuth } from './AuthContext.jsx';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoading(true);
      const res = await apiClient.get('/notifications?limit=20');
      if (res.data?.success) {
        setNotifications(res.data.data);
        setUnreadCount(res.data.unreadCount || res.data.data.filter((n) => !n.isRead).length);
      }
    } catch (e) {
      console.warn('Failed to fetch notifications:', e);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, fetchNotifications]);

  // Listen to Socket.IO real-time notification events
  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();
    if (!socket) return;

    const handleNewNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('lead:assigned', (data) => {
      handleNewNotification({
        _id: Date.now().toString(),
        title: 'New Lead Assigned',
        message: `Lead ${data.name || ''} has been assigned to you.`,
        type: 'LEAD_ASSIGNED',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });

    socket.on('followup:due', (data) => {
      handleNewNotification({
        _id: Date.now().toString(),
        title: 'Follow-up Due',
        message: `Follow-up with ${data.customerName || 'customer'} is due now.`,
        type: 'FOLLOW_UP_DUE',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('lead:assigned');
      socket.off('followup:due');
    };
  }, [isAuthenticated]);

  const markAsRead = async (id) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.warn('Failed to mark notification read:', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.warn('Failed to mark all notifications read:', e);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        refreshNotifications: fetchNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
