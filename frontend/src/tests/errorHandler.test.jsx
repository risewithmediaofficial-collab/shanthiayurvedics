import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import {
  formatErrorResolution,
  showErrorDetails,
  copyErrorDetailsToClipboard,
  STANDARD_ROUTES
} from '../utils/errorHandler.js';
import { AppFeedback } from '../components/system/AppFeedback.jsx';
import { ErrorBoundary } from '../components/system/ErrorBoundary.jsx';
import { ErrorDetailAlert } from '../components/common/ErrorDetailAlert.jsx';

describe('Error Resolution Engine (errorHandler.js)', () => {
  it('formats HTTP 400 validation error with how-to-solve and routing links', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 400,
        statusText: 'Bad Request',
        data: {
          message: 'Customer mobile must be exactly 10 digits',
          errors: { mobile: 'Invalid phone format' },
          requestId: 'req-test-400'
        }
      },
      config: { url: '/api/customers', method: 'post' }
    };

    const res = formatErrorResolution(error);
    expect(res.status).toBe(400);
    expect(res.title).toContain('Validation & Input Error');
    expect(res.message).toBe('Customer mobile must be exactly 10 digits');
    expect(res.howToSolve).toHaveLength(4);
    expect(res.howToSolve[0]).toContain('Review the form fields');
    expect(res.routingLinks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Return to Orders', path: '/orders' })
      ])
    );
    expect(res.technical.requestId).toBe('req-test-400');
    expect(res.technical.endpoint).toBe('/api/customers');
    expect(res.technical.method).toBe('POST');
  });

  it('formats HTTP 403 access restricted error with role & branch guidance', () => {
    const error = {
      response: {
        status: 403,
        data: { message: 'Only branch managers can access this view.' }
      }
    };

    const res = formatErrorResolution(error);
    expect(res.status).toBe(403);
    expect(res.title).toContain('Access Restricted');
    expect(res.message).toBe('Only branch managers can access this view.');
    expect(res.howToSolve.some((s) => s.includes('switch back'))).toBe(true);
    expect(res.routingLinks[0].path).toBe('/dashboard?tab=overview');
  });

  it('formats HTTP 404 resource not found with search and navigation guidance', () => {
    const error = {
      response: {
        status: 404,
        data: { message: 'Order #ORD-999 was not found' }
      }
    };

    const res = formatErrorResolution(error);
    expect(res.status).toBe(404);
    expect(res.title).toContain('Resource Not Found');
    expect(res.howToSolve.some((s) => s.includes('search filter'))).toBe(true);
  });

  it('formats HTTP 500 server error with retry and support guidance', () => {
    const error = {
      response: {
        status: 500,
        data: { message: 'Database query execution failed' }
      }
    };

    const res = formatErrorResolution(error);
    expect(res.status).toBe(500);
    expect(res.title).toContain('Server Processing Error');
    expect(res.howToSolve.some((s) => s.includes('Copy Error Details'))).toBe(true);
  });

  it('formats network connection timeout/offline error gracefully', () => {
    const error = { code: 'ERR_NETWORK', message: 'Network Error' };
    const res = formatErrorResolution(error);
    expect(res.title).toContain('Connection Interrupted');
    expect(res.howToSolve.some((s) => s.includes('Wi-Fi'))).toBe(true);
    expect(res.routingLinks.some((l) => l.isAction)).toBe(true);
  });

  it('copies error diagnostic report to clipboard', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText }
    });

    const error = {
      response: {
        status: 500,
        data: { message: 'Internal Crash', requestId: 'req-copy-1' }
      }
    };
    const res = formatErrorResolution(error);
    const ok = await copyErrorDetailsToClipboard(res);

    expect(ok).toBe(true);
    expect(mockWriteText).toHaveBeenCalled();
    const copiedText = mockWriteText.mock.calls[0][0];
    expect(copiedText).toContain('SHANTHI AYURVEDAS CRM ERROR REPORT');
    expect(copiedText).toContain('req-copy-1');
    expect(copiedText).toContain('HOW TO SOLVE');
  });

  it('showErrorDetails dispatches crm:error event with formatted payload', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const res = showErrorDetails('Test custom failure');

    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls.find((c) => c[0].type === 'crm:error')?.[0];
    expect(event).toBeDefined();
    expect(event.detail.title).toBeDefined();
    expect(event.detail.message).toBe('Test custom failure');
    dispatchSpy.mockRestore();
  });
});

describe('AppFeedback Component', () => {
  it('displays error alert on crm:error event and opens modal on Show Details click', async () => {
    render(
      <MemoryRouter>
        <AppFeedback />
      </MemoryRouter>
    );

    // Dispatch crm:error event inside act
    const testError = {
      response: {
        status: 403,
        data: { message: 'You do not have permission for branch Hosur.', requestId: 'req-fb-1' }
      }
    };
    const formatted = formatErrorResolution(testError);

    act(() => {
      window.dispatchEvent(new CustomEvent('crm:error', { detail: formatted }));
    });

    // Toast alert should appear
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText('Access Restricted (403)')).toBeInTheDocument();
    expect(screen.getByText('You do not have permission for branch Hosur.')).toBeInTheDocument();
    expect(screen.getByText(/Ref ID: req-fb-1/)).toBeInTheDocument();

    // Click "Show Details & How to Solve" button
    const detailsBtn = screen.getByRole('button', { name: /Show Details & How to Solve/i });
    act(() => {
      fireEvent.click(detailsBtn);
    });

    // Modal should now be displayed
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByText('How to Solve This:')).toBeInTheDocument();
    expect(screen.getByText(/Page Routing \/ Quick Navigation Links/i)).toBeInTheDocument();

    // Technical accordion can be toggled
    const techToggle = screen.getByRole('button', { name: /Technical Details & Diagnostics/i });
    act(() => {
      fireEvent.click(techToggle);
    });
    await waitFor(() => {
      expect(screen.getByText(/Copy Error Details/i)).toBeInTheDocument();
    });
  });
});

describe('ErrorBoundary Component', () => {
  it('catches render errors and displays how-to-solve guidance and routing links', () => {
    const ProblemChild = () => {
      throw new Error('Test component crashed unexpectedly');
    };

    // Suppress console.error during deliberate error test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('This screen could not be loaded')).toBeInTheDocument();
    expect(screen.getByText('Test component crashed unexpectedly')).toBeInTheDocument();
    expect(screen.getByText('How to Solve This:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reload Application/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go to Overview Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go to Orders Management/i })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});

describe('ErrorDetailAlert Component', () => {
  it('renders inline error with toggleable details and retry button', async () => {
    const onRetry = vi.fn();
    const error = {
      response: {
        status: 400,
        data: { message: 'SKU is out of stock in selected branch' }
      }
    };

    render(
      <MemoryRouter>
        <ErrorDetailAlert
          error={error}
          title="Stock Allocation Failed"
          onRetry={onRetry}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Stock Allocation Failed')).toBeInTheDocument();
    expect(screen.getByText('SKU is out of stock in selected branch')).toBeInTheDocument();

    // Click retry
    const retryBtn = screen.getByRole('button', { name: /Try Again/i });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);

    // Expand details
    const expandBtn = screen.getByRole('button', { name: /Show Details & How to Solve/i });
    fireEvent.click(expandBtn);

    expect(screen.getByText('How to Solve This:')).toBeInTheDocument();
    expect(screen.getByText(/Page Routing \/ Quick Navigation Links/i)).toBeInTheDocument();
  });
});
