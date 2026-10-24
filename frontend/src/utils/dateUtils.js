/**
 * Date and time utilities for Shanthi Ayurvedas CRM.
 * Consistently handles Indian Standard Time (IST, Asia/Kolkata) across inputs and displays.
 */

const IST_TIMEZONE = 'Asia/Kolkata';
const IST_OFFSET_MS = 330 * 60 * 1000;

/**
 * Format a Date or ISO string into a local value for <input type="datetime-local"> ("YYYY-MM-DDTHH:mm")
 * in India Standard Time (IST).
 */
export function toLocalDateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const ymd = date.toLocaleDateString('en-CA', { timeZone: IST_TIMEZONE });
  const hm = date.toLocaleTimeString('en-GB', { timeZone: IST_TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false });
  return `${ymd}T${hm}`;
}

/**
 * Converts a <input type="datetime-local"> value ("YYYY-MM-DDTHH:mm") into a proper UTC ISO string ("...Z").
 * Guarantees that the wall-clock time chosen by staff is interpreted as India Standard Time (IST).
 */
export function localDateTimeToIso(value) {
  if (!value) return undefined;
  if (typeof value !== 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  // If already an ISO string with 'Z' or timezone offset (+05:30)
  if (trimmed.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }

  // Wall-clock string from datetime-local input (YYYY-MM-DDTHH:mm)
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    const [, y, m, d, h, min, s] = match;
    const utcMs = Date.UTC(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s || 0));
    return new Date(utcMs - IST_OFFSET_MS).toISOString();
  }

  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? undefined : fallback.toISOString();
}

/**
 * Formats a scheduled date/time into 12-hour AM/PM India Standard Time (e.g. "24 Oct, 03:35 PM").
 */
export function formatFollowUpDateTime(dateValue) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';

  const datePart = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: IST_TIMEZONE
  });
  const timePart = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: IST_TIMEZONE
  });

  return `${datePart}, ${timePart}`;
}
