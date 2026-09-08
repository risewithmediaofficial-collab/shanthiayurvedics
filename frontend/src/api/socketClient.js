import { io } from 'socket.io-client';

let socket = null;

export const initSocket = (token = null) => {
  const socketToken = token || undefined;
  if (socket && socket.auth?.token === socketToken) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

  socket = io(socketUrl, {
    withCredentials: true,
    auth: {
      token: socketToken,
      requireAuth: false
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000
  });

  socket.on('connect', () => {
    console.log('⚡ Socket connected:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('Socket connection warning:', err.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
