/**
 * fileParserService.js
 *
 * Extracts raw { awbNumber, rawStatus } rows from courier-downloaded
 * Excel (.xlsx / .xls / .csv) and PDF files.
 *
 * Supported courier file formats:
 *  - India Post portal bulk tracking report (Excel / PDF)
 *  - Professional Courier (TPC) bulk tracking report (Excel / PDF)
 */

import xlsx from 'xlsx';
import { createRequire } from 'module';

// pdf-parse is a CommonJS module — must use createRequire in ESM context
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// ── AWB Pattern Helpers ──────────────────────────────────────────────────────

/** India Post AWB: EM123456789IN or CP123456789IN or RX123456789IN etc. */
const INDIA_POST_AWB_RE = /\b([A-Z]{2}\d{9}IN)\b/i;

/** Professional Courier: 12-15 digit numeric (e.g. 123456789012) */
const TPC_AWB_RE = /\b(\d{10,15})\b/;

/** Combined — tries India Post first, then TPC numeric */
const ANY_AWB_RE = new RegExp(
  `${INDIA_POST_AWB_RE.source}|${TPC_AWB_RE.source}`,
  'i'
);

function extractAwbFromText(text) {
  const ipMatch = text.match(INDIA_POST_AWB_RE);
  if (ipMatch) return ipMatch[1].toUpperCase();
  const tpcMatch = text.match(TPC_AWB_RE);
  if (tpcMatch) return tpcMatch[1];
  return null;
}

// ── Column Name Matchers ─────────────────────────────────────────────────────

const AWB_HEADER_KEYWORDS = [
  'awb', 'tracking', 'consignment', 'article', 'barcode',
  'shipment no', 'track no', 'cn no', 'cn number', 'docket'
];

const STATUS_HEADER_KEYWORDS = [
  'status', 'delivery status', 'current status', 'scan status',
  'event', 'remarks', 'description', 'activity'
];

function matchesKeyword(header, keywords) {
  const lower = String(header).toLowerCase().trim();
  return keywords.some((kw) => lower.includes(kw));
}

// ── Excel Parser ─────────────────────────────────────────────────────────────

/**
 * Parse an Excel / CSV buffer into rows.
 * Returns Array<{ awbNumber: string, rawStatus: string }>
 */
export function parseExcelBuffer(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to array of arrays (raw) to find header row dynamically
  const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!rawRows || rawRows.length < 2) return [];

  // Find the header row (first row containing an AWB-like or status keyword)
  let headerRowIdx = 0;
  let awbColIdx = -1;
  let statusColIdx = -1;

  for (let r = 0; r < Math.min(10, rawRows.length); r++) {
    const row = rawRows[r];
    let foundAwb = -1;
    let foundStatus = -1;

    row.forEach((cell, c) => {
      const cellStr = String(cell);
      if (foundAwb === -1 && matchesKeyword(cellStr, AWB_HEADER_KEYWORDS)) foundAwb = c;
      if (foundStatus === -1 && matchesKeyword(cellStr, STATUS_HEADER_KEYWORDS)) foundStatus = c;
    });

    if (foundAwb !== -1) {
      headerRowIdx = r;
      awbColIdx = foundAwb;
      statusColIdx = foundStatus;
      break;
    }
  }

  // Fallback: assume col 0 = AWB, col 1 = status if no headers detected
  if (awbColIdx === -1) {
    awbColIdx = 0;
    statusColIdx = 1;
    headerRowIdx = 0; // skip no header rows — treat row 0 as data
  }

  const dataRows = rawRows.slice(headerRowIdx + 1);
  const results = [];

  for (const row of dataRows) {
    const rawAwb = String(row[awbColIdx] ?? '').trim();
    const rawStatus = String(statusColIdx !== -1 ? (row[statusColIdx] ?? '') : '').trim();

    if (!rawAwb) continue;

    // Try to extract a clean AWB number from the cell value
    const awbNumber = extractAwbFromText(rawAwb) || rawAwb.toUpperCase();

    if (awbNumber) {
      results.push({ awbNumber, rawStatus });
    }
  }

  return results;
}

// ── PDF Parser ───────────────────────────────────────────────────────────────

/**
 * Parse a PDF buffer by extracting text and scanning each line for AWB + status.
 * Returns Array<{ awbNumber: string, rawStatus: string }>
 */
export async function parsePdfBuffer(buffer) {
  const data = await pdfParse(buffer);
  const lines = data.text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const results = [];

  for (const line of lines) {
    const awbNumber = extractAwbFromText(line);
    if (!awbNumber) continue;

    // Extract status: everything after the AWB number on the same line
    const afterAwb = line.replace(ANY_AWB_RE, '').trim();

    // Clean up leading separators / pipe characters
    const rawStatus = afterAwb.replace(/^[\s|,\-:]+/, '').trim();

    results.push({ awbNumber, rawStatus: rawStatus || 'Unknown' });
  }

  return results;
}

// ── Unified Entry Point ──────────────────────────────────────────────────────

/**
 * Detect file type from mimetype / originalname, then parse.
 * @param {Buffer} buffer
 * @param {string} mimetype
 * @param {string} originalname
 * @returns {Promise<Array<{ awbNumber: string, rawStatus: string }>>}
 */
export async function parseFile(buffer, mimetype, originalname) {
  const ext = originalname.split('.').pop().toLowerCase();
  const isPdf =
    mimetype === 'application/pdf' ||
    ext === 'pdf';

  if (isPdf) {
    return parsePdfBuffer(buffer);
  }

  // Excel / CSV
  return parseExcelBuffer(buffer);
}
