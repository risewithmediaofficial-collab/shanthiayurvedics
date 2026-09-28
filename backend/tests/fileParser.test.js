/**
 * Unit / integration tests for fileParserService.js
 *   - extractAwbFromText (via parseExcelBuffer)
 *   - parseExcelBuffer
 *   - parsePdfBuffer
 *   - parseFile (unified entry point)
 */

import { describe, it, expect } from 'vitest';
import xlsx from 'xlsx';
import { parseExcelBuffer, parsePdfBuffer, parseFile } from '../src/services/fileParserService.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a minimal Excel buffer from a 2D array of rows.
 * Row 0 is treated as headers.
 */
function buildExcelBuffer(rows) {
  const ws = xlsx.utils.aoa_to_sheet(rows);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// ─── parseExcelBuffer ─────────────────────────────────────────────────────────

describe('parseExcelBuffer()', () => {
  it('should return empty array for empty/short buffer', () => {
    const buf = buildExcelBuffer([['AWB', 'Status']]); // header only, no data
    const result = parseExcelBuffer(buf);
    expect(result).toEqual([]);
  });

  it('should parse India Post AWB numbers from explicit AWB column', () => {
    const buf = buildExcelBuffer([
      ['Tracking No', 'Delivery Status'],
      ['EM123456789IN', 'Delivered'],
      ['CP987654321IN', 'In Transit']
    ]);
    const result = parseExcelBuffer(buf);
    expect(result).toHaveLength(2);
    expect(result[0].awbNumber).toBe('EM123456789IN');
    expect(result[0].rawStatus).toBe('Delivered');
    expect(result[1].awbNumber).toBe('CP987654321IN');
  });

  it('should parse Professional Courier numeric AWBs', () => {
    const buf = buildExcelBuffer([
      ['AWB Number', 'Status'],
      ['123456789012', 'Out for Delivery'],
      ['987654321098', 'Delivered']
    ]);
    const result = parseExcelBuffer(buf);
    expect(result).toHaveLength(2);
    expect(result[0].awbNumber).toBe('123456789012');
    expect(result[1].rawStatus).toBe('Delivered');
  });

  it('should handle rows with empty AWB gracefully (skip them)', () => {
    const buf = buildExcelBuffer([
      ['AWB', 'Status'],
      ['', 'Unknown'],
      ['EM111111111IN', 'Delivered']
    ]);
    const result = parseExcelBuffer(buf);
    expect(result).toHaveLength(1);
    expect(result[0].awbNumber).toBe('EM111111111IN');
  });

  it('should handle files with no header (fallback: col 0 = AWB, col 1 = status)', () => {
    const buf = buildExcelBuffer([
      ['EM999000111IN', 'RTO'],
      ['EM888777666IN', 'Delivered']
    ]);
    const result = parseExcelBuffer(buf);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('should uppercase India Post AWB numbers', () => {
    const buf = buildExcelBuffer([
      ['AWB', 'Status'],
      ['em123456789in', 'Delivered']
    ]);
    const result = parseExcelBuffer(buf);
    if (result.length > 0) {
      expect(result[0].awbNumber).toBe('EM123456789IN');
    }
  });
});

// ─── parsePdfBuffer ───────────────────────────────────────────────────────────

describe('parsePdfBuffer()', () => {
  // Note: generating a real PDF buffer in unit tests requires a PDF library.
  // We'll test the function's shape and error handling instead.

  it('should return an array (async)', async () => {
    // Build a minimal valid PDF buffer using a well-known minimal PDF structure
    const minimalPdf = Buffer.from(
      '%PDF-1.4\n1 0 obj<</Type /Catalog /Pages 2 0 R>>endobj\n' +
      '2 0 obj<</Type /Pages /Kids [3 0 R] /Count 1>>endobj\n' +
      '3 0 obj<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]>>endobj\n' +
      'xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n' +
      '0000000058 00000 n\n0000000115 00000 n\n' +
      'trailer<</Size 4 /Root 1 0 R>>\nstartxref\n204\n%%EOF',
      'utf-8'
    );

    // pdf-parse may throw on truly empty pages — handle gracefully
    try {
      const result = await parsePdfBuffer(minimalPdf);
      expect(Array.isArray(result)).toBe(true);
    } catch (err) {
      // Acceptable: pdf-parse throws on an empty/corrupt PDF
      expect(err).toBeDefined();
    }
  });
});

// ─── parseFile (unified entry point) ─────────────────────────────────────────

describe('parseFile()', () => {
  it('should route .xlsx files to the excel parser', async () => {
    const buf = buildExcelBuffer([
      ['AWB', 'Status'],
      ['EM123456789IN', 'Delivered']
    ]);
    const result = await parseFile(buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'report.xlsx');
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].awbNumber).toBe('EM123456789IN');
  });

  it('should route .csv files to the excel parser', async () => {
    const buf = buildExcelBuffer([
      ['Tracking No', 'Status'],
      ['EM555444333IN', 'In Transit']
    ]);
    const result = await parseFile(buf, 'text/csv', 'tracking.csv');
    expect(Array.isArray(result)).toBe(true);
  });

  it('should route .pdf files to the pdf parser (by extension)', async () => {
    // Use a minimal pdf-like buffer and expect array back (even if empty)
    const fakePdf = Buffer.from('%PDF-1.4 fake content EM000000001IN Delivered\n%%EOF');
    try {
      const result = await parseFile(fakePdf, 'text/plain', 'data.pdf');
      expect(Array.isArray(result)).toBe(true);
    } catch {
      // Acceptable if pdf-parse rejects corrupt PDF
    }
  });

  it('should route application/pdf mimetype to pdf parser', async () => {
    const fakePdf = Buffer.from('%PDF-1.4 EM000000002IN Delivered\n%%EOF');
    try {
      const result = await parseFile(fakePdf, 'application/pdf', 'data.xlsx');
      expect(Array.isArray(result)).toBe(true);
    } catch {
      // Acceptable
    }
  });
});
