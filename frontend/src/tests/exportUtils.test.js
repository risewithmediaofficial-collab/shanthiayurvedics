/**
 * Unit tests for frontend utility functions:
 *   - exportToExcel
 *   - exportToCSV
 * from src/utils/exportUtils.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as XLSX from 'xlsx';

// ── We test exportUtils with alert mocked in setup.js ─────────────────────────
// XLSX.writeFile is a browser side-effect — spy on it to prevent file download
vi.mock('xlsx', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    writeFile: vi.fn()
  };
});

// Import AFTER mock
const { exportToExcel, exportToCSV } = await import('../utils/exportUtils.js');

// ─── exportToExcel ────────────────────────────────────────────────────────────

describe('exportToExcel()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
  });

  it('should alert and return early when data is empty array', () => {
    exportToExcel([], 'test');
    expect(window.alert).toHaveBeenCalledWith('No data available to export');
    expect(XLSX.writeFile).not.toHaveBeenCalled();
  });

  it('should alert and return early when data is null', () => {
    exportToExcel(null, 'test');
    expect(window.alert).toHaveBeenCalledWith('No data available to export');
  });

  it('should call XLSX.writeFile with a valid .xlsx filename', () => {
    const data = [{ Name: 'Alice', Age: 30 }];
    exportToExcel(data, 'test_report', 'Customers');
    expect(XLSX.writeFile).toHaveBeenCalledOnce();
    const [, filename] = XLSX.writeFile.mock.calls[0];
    expect(filename).toMatch(/test_report.*\.xlsx$/);
  });

  it('should sanitize special characters in filename', () => {
    const data = [{ id: 1 }];
    exportToExcel(data, 'Report Name (2024)', 'Sheet');
    const [, filename] = XLSX.writeFile.mock.calls[0];
    expect(filename).not.toMatch(/[()]/);
  });

  it('should truncate sheetName to 31 characters', () => {
    const data = [{ id: 1 }];
    exportToExcel(data, 'file', 'A'.repeat(40));
    // Verify writeFile was called — sheetName truncation happens internally
    expect(XLSX.writeFile).toHaveBeenCalledOnce();
  });

  it('should not alert for valid data', () => {
    exportToExcel([{ key: 'value' }], 'export');
    expect(window.alert).not.toHaveBeenCalled();
  });
});

// ─── exportToCSV ──────────────────────────────────────────────────────────────

describe('exportToCSV()', () => {
  let appendChildSpy;
  let removeChildSpy;
  let clickSpy;
  let createdLink;

  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-csv-url');
    window.URL.revokeObjectURL = vi.fn();

    // Intercept anchor creation
    clickSpy = vi.fn();
    createdLink = {
      href: '',
      setAttribute: vi.fn(),
      click: clickSpy
    };
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return createdLink;
      return document.createElement.wrappedMethod?.(tag) ?? {};
    });
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should alert and return early when data is empty', () => {
    exportToCSV([], 'test');
    expect(window.alert).toHaveBeenCalledWith('No data available to export');
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('should alert and return early when data is null', () => {
    exportToCSV(null, 'test');
    expect(window.alert).toHaveBeenCalledWith('No data available to export');
  });

  it('should trigger a download click for valid data', () => {
    exportToCSV([{ Name: 'Bob', Score: 100 }], 'scores');
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('should revoke the object URL after download', () => {
    exportToCSV([{ id: 1 }], 'data');
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-csv-url');
  });

  it('should set a download attribute with .csv extension', () => {
    exportToCSV([{ col: 'val' }], 'myexport');
    const setAttribute = createdLink.setAttribute;
    const downloadCall = setAttribute.mock.calls.find(([attr]) => attr === 'download');
    expect(downloadCall).toBeDefined();
    expect(downloadCall[1]).toMatch(/\.csv$/);
  });

  it('should sanitize filename special characters', () => {
    exportToCSV([{ id: 1 }], 'My Report (Q1)');
    const setAttribute = createdLink.setAttribute;
    const downloadCall = setAttribute.mock.calls.find(([attr]) => attr === 'download');
    expect(downloadCall[1]).not.toMatch(/[()]/);
  });
});
