/**
 * Frontend test setup file — imported by vitest before every test suite.
 * - Extends jest-dom matchers (toBeInTheDocument, toHaveValue, etc.)
 * - Mocks browser APIs not available in jsdom (localStorage, sessionStorage, etc.)
 * - Mocks socket.io-client
 */

import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Auto-cleanup React components after each test
afterEach(() => {
  cleanup();
});

// ── localStorage mock ─────────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ── sessionStorage mock ───────────────────────────────────────────────────────
const sessionStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// ── socket.io-client mock ─────────────────────────────────────────────────────
vi.mock('socket.io-client', () => {
  const socket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn(),
    connected: true
  };
  return {
    default: vi.fn(() => socket),
    io: vi.fn(() => socket)
  };
});

// ── import.meta.env mock ──────────────────────────────────────────────────────
// Already handled by vitest globals; VITE_API_URL defaults to undefined → '/api'

// ── URL.createObjectURL mock (for CSV export) ─────────────────────────────────
if (!window.URL.createObjectURL) {
  window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  window.URL.revokeObjectURL = vi.fn();
}

// ── document.body.appendChild is available in jsdom already ──────────────────

// ── window.alert mock (used in exportUtils.js) ───────────────────────────────
window.alert = vi.fn();
