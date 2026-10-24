import { AppError } from './errors.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const INDIA_OFFSET_MS = 330 * 60 * 1000;

export function businessDateBoundaries(now = new Date()) {
  const local = new Date(now.getTime() + INDIA_OFFSET_MS);
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - INDIA_OFFSET_MS;
  return {
    startOfToday: new Date(midnight),
    endOfToday: new Date(midnight + DAY_MS - 1),
    startOfYesterday: new Date(midnight - DAY_MS),
    endOfYesterday: new Date(midnight - 1),
    startOfWeek: new Date(midnight - local.getUTCDay() * DAY_MS),
    startOfMonth: new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - INDIA_OFFSET_MS)
  };
}

export function parseBusinessDate(value, endOfDay = false) {
  if (typeof value !== 'string') throw new AppError('Enter a valid date', 400);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const calendarDate = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== value) {
      throw new AppError('Enter a valid calendar date', 400);
    }
    return new Date(calendarDate.getTime() - INDIA_OFFSET_MS + (endOfDay ? DAY_MS - 1 : 0));
  }
  const date = new Date(value);
  if (!value.includes('T') || Number.isNaN(date.getTime())) throw new AppError('Enter a valid date', 400);
  return date;
}

/**
 * Parses date-time inputs for Indian business operations (e.g. follow-up scheduling).
 * - If given an ISO string with explicit timezone ('Z' or offset), preserves the exact instant.
 * - If given a wall-clock local string without timezone (e.g. "YYYY-MM-DDTHH:mm"), accurately interprets it
 *   as India Standard Time (IST, UTC+05:30) rather than server UTC time.
 */
export function parseBusinessDateTime(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const trimmed = value.trim();
  if (!trimmed) return null;

  // 1. Explicit timezone marker (UTC 'Z' or +/-HH:mm offset)
  if (trimmed.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) throw new AppError('Enter a valid date and time', 400);
    return d;
  }

  // 2. Wall-clock format without timezone (e.g. "2026-10-24T15:35" or "2026-10-24 15:35:00")
  const dtMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (dtMatch) {
    const [, y, m, d, h, min, s] = dtMatch;
    const utcMs = Date.UTC(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s || 0));
    return new Date(utcMs - INDIA_OFFSET_MS);
  }

  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) throw new AppError('Enter a valid date and time', 400);
  return d;
}

