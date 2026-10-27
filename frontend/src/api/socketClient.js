import { io } from 'socket.io-client';

let socket = null;
let connectionState = 'disconnected'; // 'connected' | 'connecting' | 'disconnected' | 'reconnecting'
let hasEverConnected = false;
const connectionListeners = new Set();
const seenEventIds = new Set();
const MAX_SEEN_EVENT_IDS = 200;

const notifyConnectionListeners = () => {
  const state = {
    state: connectionState,
    connected: connectionState === 'connected',
    connecting: connectionState === 'connecting' || connectionState === 'reconnecting',
    socketId: socket?.id || null
  };
  connectionListeners.forEach((listener) => {
    try {
      listener(state);
    } catch (err) {
      console.warn('Error in socket connection listener:', err);
    }
  });
};

/**
 * Checks whether an event has already been processed by eventId.
 * Prevents duplicate state transitions or UI alerts over flaky connections.
 */
export const isDuplicateEvent = (eventId) => {
  if (!eventId) return false;
  if (seenEventIds.has(eventId)) {
    return true;
  }
  seenEventIds.add(eventId);
  if (seenEventIds.size > MAX_SEEN_EVENT_IDS) {
    // Delete oldest entries
    const iterator = seenEventIds.values();
    const oldest = iterator.next().value;
    if (oldest) seenEventIds.delete(oldest);
  }
  return false;
};

export const initSocket = (token = null) => {
  let socketToken = token;
  if (!socketToken && typeof window !== 'undefined') {
    try {
      socketToken = localStorage.getItem('auth_access_token') || null;
    } catch {
      // Storage restricted
    }
  }

  if (socket && socket.connected) {
    if (socketToken && socket.auth?.token !== socketToken) {
      socket.auth.token = socketToken;
      socket.emit('crm:authenticate', { token: socketToken });
    }
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

  connectionState = hasEverConnected ? 'reconnecting' : 'connecting';
  notifyConnectionListeners();

  socket = io(socketUrl, {
    withCredentials: true,
    auth: {
      token: socketToken || undefined,
      requireAuth: false
    },
    transports: ['websocket', 'polling'],
    upgrade: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000
  });

  socket.on('connect', () => {
    const isReconnection = hasEverConnected;
    hasEverConnected = true;
    connectionState = 'connected';
    notifyConnectionListeners();

    if (socketToken) {
      socket.emit('crm:authenticate', { token: socketToken });
    }

    if (isReconnection) {
      // Notify application of reconnection to trigger data sync
      socket.emit('crm:client_reconnected', { timestamp: Date.now() });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('crm:socket_reconnected', { detail: { socketId: socket.id } }));
      }
    }
  });

  socket.on('disconnect', (reason) => {
    connectionState = 'disconnected';
    notifyConnectionListeners();
    if (reason === 'io server disconnect') {
      // The disconnection was initiated by the server, reconnect manually
      socket.connect();
    }
  });

  socket.on('connect_error', (_err) => {
    connectionState = hasEverConnected ? 'reconnecting' : 'disconnected';
    notifyConnectionListeners();
  });

  return socket;
};

export const getSocket = () => socket;

export const getConnectionState = () => ({
  state: connectionState,
  connected: connectionState === 'connected',
  connecting: connectionState === 'connecting' || connectionState === 'reconnecting',
  socketId: socket?.id || null
});

export const addConnectionListener = (listener) => {
  connectionListeners.add(listener);
  // Send current state immediately
  listener(getConnectionState());
  return () => {
    connectionListeners.delete(listener);
  };
};

/**
 * Register a listener for a socket event with automatic cleanup return function.
 */
export const onSocketEvent = (event, callback) => {
  if (!socket) return () => {};

  const wrappedCallback = (data) => {
    if (data?.eventId && isDuplicateEvent(data.eventId)) {
      return; // Deduplicate
    }
    callback(data);
  };

  socket.on(event, wrappedCallback);
  return () => {
    socket?.off(event, wrappedCallback);
  };
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  connectionState = 'disconnected';
  notifyConnectionListeners();
};
