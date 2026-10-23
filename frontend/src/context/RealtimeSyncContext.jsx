import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext.jsx';
import { getSocket, addConnectionListener, isDuplicateEvent } from '../api/socketClient.js';

const RealtimeSyncContext = createContext({
  isConnected: false,
  connectionState: 'disconnected',
  socketId: null
});

export function RealtimeSyncProvider({ children }) {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false,
    connectionState: 'disconnected',
    socketId: null
  });

  // Debounced cache invalidation batcher (50ms window) to prevent query stampedes on bulk operations
  const pendingKeysRef = useRef(new Set());
  const batchTimerRef = useRef(null);

  const invalidateBatch = useCallback((keys) => {
    if (!Array.isArray(keys) || keys.length === 0) return;

    keys.forEach((k) => {
      pendingKeysRef.current.add(JSON.stringify(k));
    });

    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
    }

    batchTimerRef.current = setTimeout(() => {
      const keysToInvalidate = Array.from(pendingKeysRef.current).map((str) => JSON.parse(str));
      pendingKeysRef.current.clear();
      batchTimerRef.current = null;

      keysToInvalidate.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey, exact: false });
      });
    }, 50);
  }, [queryClient]);

  // Track socket connection state
  useEffect(() => {
    const unsubscribe = addConnectionListener((status) => {
      setConnectionStatus({
        isConnected: status.connected,
        connectionState: status.state,
        socketId: status.socketId
      });
    });
    return unsubscribe;
  }, []);

  // Listen to reconnection event to fetch fresh data and prevent stale UI after network drops
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleReconnected = () => {
      // Invalidate all currently visible active queries
      queryClient.invalidateQueries({ type: 'active' });
    };

    window.addEventListener('crm:socket_reconnected', handleReconnected);
    return () => {
      window.removeEventListener('crm:socket_reconnected', handleReconnected);
    };
  }, [isAuthenticated, queryClient]);

  // Register real-time domain event listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();
    if (!socket) return;

    const handleOrderEvent = (data) => {
      if (data?.eventId && isDuplicateEvent(data.eventId)) return;

      const keys = [
        ['orders'],
        ['order-metrics-summary'],
        ['stuckOrders'],
        ['dashboard'],
        ['sidebar-metrics']
      ];
      if (data?.orderId) {
        keys.push(['order', data.orderId]);
      }
      invalidateBatch(keys);
    };

    const handleLeadEvent = (data) => {
      if (data?.eventId && isDuplicateEvent(data.eventId)) return;

      const keys = [
        ['leads'],
        ['lead-metrics-summary'],
        ['dashboard'],
        ['sidebar-metrics'],
        ['callHistory']
      ];
      if (data?.leadId) {
        keys.push(['lead', data.leadId]);
      }
      invalidateBatch(keys);
    };

    const handleCallEvent = (data) => {
      if (data?.eventId && isDuplicateEvent(data.eventId)) return;

      invalidateBatch([
        ['leads'],
        ['lead-metrics-summary'],
        ['callHistory'],
        ['dashboard'],
        ['sidebar-metrics']
      ]);
      if (data?.leadId) {
        invalidateBatch([['lead', data.leadId]]);
      }
    };

    const handleFollowupEvent = (data) => {
      if (data?.eventId && isDuplicateEvent(data.eventId)) return;

      const keys = [
        ['followups'],
        ['followup-metrics'],
        ['dashboard'],
        ['sidebar-metrics']
      ];
      if (data?.followupId) {
        keys.push(['followup', data.followupId]);
      }
      invalidateBatch(keys);
    };

    const handleInventoryEvent = (data) => {
      if (data?.eventId && isDuplicateEvent(data.eventId)) return;

      invalidateBatch([
        ['inventory'],
        ['stockTransfers'],
        ['stock-movements'],
        ['manager-stock-matrix'],
        ['sidebar-metrics']
      ]);
    };

    const handleShippingEvent = (data) => {
      if (data?.eventId && isDuplicateEvent(data.eventId)) return;

      const keys = [
        ['shipments'],
        ['tracking'],
        ['operationsSummary'],
        ['dashboard']
      ];
      if (data?.awbNumber) {
        keys.push(['tracking', data.awbNumber]);
      }
      invalidateBatch(keys);
    };

    const handleRTOEvent = (data) => {
      if (data?.eventId && isDuplicateEvent(data.eventId)) return;

      invalidateBatch([
        ['rtoRecords'],
        ['operationsSummary'],
        ['inventory'],
        ['dashboard']
      ]);
    };

    const handleWithdrawalEvent = (data) => {
      if (data?.eventId && isDuplicateEvent(data.eventId)) return;

      invalidateBatch([
        ['withdrawals'],
        ['tillDateWithdrawal'],
        ['reportSales']
      ]);
    };

    const handleCustomerEvent = (data) => {
      if (data?.eventId && isDuplicateEvent(data.eventId)) return;

      const keys = [['customers']];
      if (data?.customerId) {
        keys.push(['customer', data.customerId]);
      }
      invalidateBatch(keys);
    };

    const handleProductEvent = (data) => {
      if (data?.eventId && isDuplicateEvent(data.eventId)) return;

      invalidateBatch([
        ['products'],
        ['product-categories'],
        ['active-products-catalog']
      ]);
    };

    // Attach domain events
    socket.on('order:new', handleOrderEvent);
    socket.on('order:created', handleOrderEvent);
    socket.on('order:updated', handleOrderEvent);
    socket.on('order:status_changed', handleOrderEvent);
    socket.on('order:deleted', handleOrderEvent);
    socket.on('order:bulk_status_changed', handleOrderEvent);
    socket.on('order:bulk_assigned', handleOrderEvent);
    socket.on('order:bulk_verified', handleOrderEvent);
    socket.on('order:assigned', handleOrderEvent);

    socket.on('lead:created', handleLeadEvent);
    socket.on('lead:updated', handleLeadEvent);
    socket.on('lead:deleted', handleLeadEvent);
    socket.on('lead:assigned', handleLeadEvent);
    socket.on('lead:bulk_assigned', handleLeadEvent);
    socket.on('call:logged', handleCallEvent);

    socket.on('followup:created', handleFollowupEvent);
    socket.on('followup:completed', handleFollowupEvent);
    socket.on('followup:due', handleFollowupEvent);

    socket.on('inventory:updated', handleInventoryEvent);
    socket.on('stock:movement', handleInventoryEvent);
    socket.on('stock:transfer_created', handleInventoryEvent);
    socket.on('stock:transfer_dispatched', handleInventoryEvent);
    socket.on('stock:transfer_received', handleInventoryEvent);

    socket.on('shipment:created', handleShippingEvent);
    socket.on('shipment:status_changed', handleShippingEvent);
    socket.on('shipment:cancelled', handleShippingEvent);

    socket.on('rto:created', handleRTOEvent);
    socket.on('rto:received', handleRTOEvent);
    socket.on('rto:verified', handleRTOEvent);

    socket.on('withdrawal:created', handleWithdrawalEvent);
    socket.on('withdrawal:settled', handleWithdrawalEvent);

    socket.on('customer:created', handleCustomerEvent);
    socket.on('customer:updated', handleCustomerEvent);
    socket.on('customer:deleted', handleCustomerEvent);

    socket.on('product:created', handleProductEvent);
    socket.on('product:updated', handleProductEvent);
    socket.on('product:deleted', handleProductEvent);
    socket.on('product:category_created', handleProductEvent);

    return () => {
      socket.off('order:new', handleOrderEvent);
      socket.off('order:created', handleOrderEvent);
      socket.off('order:updated', handleOrderEvent);
      socket.off('order:status_changed', handleOrderEvent);
      socket.off('order:deleted', handleOrderEvent);
      socket.off('order:bulk_status_changed', handleOrderEvent);
      socket.off('order:bulk_assigned', handleOrderEvent);
      socket.off('order:bulk_verified', handleOrderEvent);
      socket.off('order:assigned', handleOrderEvent);

      socket.off('lead:created', handleLeadEvent);
      socket.off('lead:updated', handleLeadEvent);
      socket.off('lead:deleted', handleLeadEvent);
      socket.off('lead:assigned', handleLeadEvent);
      socket.off('lead:bulk_assigned', handleLeadEvent);
      socket.off('call:logged', handleCallEvent);

      socket.off('followup:created', handleFollowupEvent);
      socket.off('followup:completed', handleFollowupEvent);
      socket.off('followup:due', handleFollowupEvent);

      socket.off('inventory:updated', handleInventoryEvent);
      socket.off('stock:movement', handleInventoryEvent);
      socket.off('stock:transfer_created', handleInventoryEvent);
      socket.off('stock:transfer_dispatched', handleInventoryEvent);
      socket.off('stock:transfer_received', handleInventoryEvent);

      socket.off('shipment:created', handleShippingEvent);
      socket.off('shipment:status_changed', handleShippingEvent);
      socket.off('shipment:cancelled', handleShippingEvent);

      socket.off('rto:created', handleRTOEvent);
      socket.off('rto:received', handleRTOEvent);
      socket.off('rto:verified', handleRTOEvent);

      socket.off('withdrawal:created', handleWithdrawalEvent);
      socket.off('withdrawal:settled', handleWithdrawalEvent);

      socket.off('customer:created', handleCustomerEvent);
      socket.off('customer:updated', handleCustomerEvent);
      socket.off('customer:deleted', handleCustomerEvent);

      socket.off('product:created', handleProductEvent);
      socket.off('product:updated', handleProductEvent);
      socket.off('product:deleted', handleProductEvent);
      socket.off('product:category_created', handleProductEvent);

      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
    };
  }, [isAuthenticated, user?.id, invalidateBatch]);

  return (
    <RealtimeSyncContext.Provider value={connectionStatus}>
      {children}
    </RealtimeSyncContext.Provider>
  );
}

export function useRealtimeSync() {
  return useContext(RealtimeSyncContext);
}

/**
 * Aesthetic real-time connection status badge for headers and dashboard layouts.
 */
export function RealtimeStatusBadge({ className = '' }) {
  const { isConnected, connectionState } = useRealtimeSync();

  const getStatusDetails = () => {
    switch (connectionState) {
      case 'connected':
        return {
          dotClass: 'bg-emerald-500 animate-pulse',
          textClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          label: 'Live'
        };
      case 'reconnecting':
      case 'connecting':
        return {
          dotClass: 'bg-amber-500 animate-ping',
          textClass: 'text-amber-700 bg-amber-50 border-amber-200',
          label: 'Syncing'
        };
      case 'disconnected':
      default:
        return {
          dotClass: 'bg-slate-400',
          textClass: 'text-slate-600 bg-slate-50 border-slate-200',
          label: 'Offline'
        };
    }
  };

  const { dotClass, textClass, label } = getStatusDetails();

  return (
    <div
      title={isConnected ? 'Real-time WebSocket synchronization connected' : 'Connecting to real-time sync...'}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${textClass} ${className}`}
    >
      <span className={`w-2 h-2 rounded-full ${dotClass}`} />
      <span>{label}</span>
    </div>
  );
}
