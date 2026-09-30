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
