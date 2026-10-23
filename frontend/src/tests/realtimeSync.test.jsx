import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RealtimeSyncProvider,
  useRealtimeSync,
  RealtimeStatusBadge
} from '../context/RealtimeSyncContext.jsx';
import {
  isDuplicateEvent,
  getConnectionState,
  addConnectionListener
} from '../api/socketClient.js';

// Mock AuthContext
let mockAuthState = { isAuthenticated: true, user: { id: 'usr-1', role: 'TELECALLER' } };
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => mockAuthState
}));

// Mock socket
const mockSocketHandlers = {};
const mockSocket = {
  id: 'socket-test-123',
  on: vi.fn((event, handler) => {
    mockSocketHandlers[event] = handler;
  }),
  off: vi.fn((event) => {
    delete mockSocketHandlers[event];
  }),
  emit: vi.fn(),
  disconnect: vi.fn(),
  connect: vi.fn()
};

vi.mock('../api/socketClient.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getSocket: () => mockSocket
  };
});

function TestConsumer() {
  const sync = useRealtimeSync();
  return (
    <div>
      <span data-testid="status-connected">{sync.isConnected ? 'YES' : 'NO'}</span>
      <span data-testid="status-state">{sync.connectionState}</span>
      <RealtimeStatusBadge />
    </div>
  );
}

describe('Real-time Synchronization Suite', () => {
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 }
      }
    });
    vi.spyOn(queryClient, 'invalidateQueries');
  });

  it('correctly tracks and deduplicates events by eventId', () => {
    const eventId = 'unique-event-abc-123';
    expect(isDuplicateEvent(eventId)).toBe(false);
    // Second check should be duplicate
    expect(isDuplicateEvent(eventId)).toBe(true);
    // Different eventId should not be duplicate
    expect(isDuplicateEvent('another-event-xyz')).toBe(false);
  });

  it('renders RealtimeStatusBadge with Offline status by default when disconnected', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RealtimeSyncProvider>
          <TestConsumer />
        </RealtimeSyncProvider>
      </QueryClientProvider>
    );

    expect(screen.getByTestId('status-connected').textContent).toBe('NO');
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('invalidates order query keys in debounced batches on order events', async () => {
    vi.useFakeTimers();

    render(
      <QueryClientProvider client={queryClient}>
        <RealtimeSyncProvider>
          <TestConsumer />
        </RealtimeSyncProvider>
      </QueryClientProvider>
    );

    expect(mockSocket.on).toHaveBeenCalledWith('order:updated', expect.any(Function));

    // Simulate order:updated socket event
    act(() => {
      mockSocketHandlers['order:updated']?.({
        orderId: 'ord-999',
        orderNumber: 'ORD-123',
        status: 'CONFIRMED',
        eventId: 'evt-order-1'
      });
    });

    // Advance 50ms batching timer
    act(() => {
      vi.advanceTimersByTime(60);
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['orders'] })
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['order', 'ord-999'] })
    );

    vi.useRealTimers();
  });

  it('invalidates active queries when crm:socket_reconnected event fires', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RealtimeSyncProvider>
          <TestConsumer />
        </RealtimeSyncProvider>
      </QueryClientProvider>
    );

    act(() => {
      window.dispatchEvent(new CustomEvent('crm:socket_reconnected', { detail: { socketId: 's1' } }));
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ type: 'active' });
  });

  it('invalidates lead and call query keys on call:logged socket event', () => {
    vi.useFakeTimers();

    render(
      <QueryClientProvider client={queryClient}>
        <RealtimeSyncProvider>
          <TestConsumer />
        </RealtimeSyncProvider>
      </QueryClientProvider>
    );

    act(() => {
      mockSocketHandlers['call:logged']?.({
        leadId: 'lead-888',
        callId: 'call-1',
        callStatus: 'CONNECTED_INTERESTED',
        eventId: 'evt-call-1'
      });
    });

    act(() => {
      vi.advanceTimersByTime(60);
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['leads'] })
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['callHistory'] })
    );

    vi.useRealTimers();
  });
});
