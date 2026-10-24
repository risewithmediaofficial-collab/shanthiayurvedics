import { businessDateBoundaries, parseBusinessDateTime } from '../src/utils/businessTime.js';
import { dateRange } from '../src/utils/queryHelpers.js';

describe('India business dates', () => {
  it('includes the entire selected India calendar day', () => {
    const range = dateRange('2026-09-30', '2026-09-30');
    expect(range.$gte.toISOString()).toBe('2026-09-29T18:30:00.000Z');
    expect(range.$lte.toISOString()).toBe('2026-09-30T18:29:59.999Z');
  });

  it('keeps explicit timestamps and rejects invalid or reversed dates', () => {
    expect(dateRange('2026-09-30T08:00:00.000Z').$gte.toISOString()).toBe('2026-09-30T08:00:00.000Z');
    expect(() => dateRange('2026-02-30')).toThrow();
    expect(() => dateRange('2026-10-01', '2026-09-30')).toThrow();
  });

  it('uses the new India month even when UTC and the current week are in the previous month', () => {
    const boundaries = businessDateBoundaries(new Date('2026-09-30T19:00:00.000Z'));
    expect(boundaries.startOfToday.toISOString()).toBe('2026-09-30T18:30:00.000Z');
    expect(boundaries.endOfToday.toISOString()).toBe('2026-10-01T18:29:59.999Z');
    expect(boundaries.startOfMonth.toISOString()).toBe('2026-09-30T18:30:00.000Z');
    expect(boundaries.startOfWeek.toISOString()).toBe('2026-09-26T18:30:00.000Z');
  });

  it('accurately parses date-time strings without timezone as India Standard Time (IST, UTC+5:30)', () => {
    // 3:35 PM on 24 Oct in IST is 10:05 AM UTC
    const parsed = parseBusinessDateTime('2026-10-24T15:35');
    expect(parsed.toISOString()).toBe('2026-10-24T10:05:00.000Z');

    // 9:33 AM on 24 Oct in IST is 04:03 AM UTC
    const parsedMorning = parseBusinessDateTime('2026-10-24T09:33');
    expect(parsedMorning.toISOString()).toBe('2026-10-24T04:03:00.000Z');

    // Explicit UTC strings with 'Z' are preserved without double-shifting
    const parsedUtc = parseBusinessDateTime('2026-10-24T10:05:00.000Z');
    expect(parsedUtc.toISOString()).toBe('2026-10-24T10:05:00.000Z');

    // Explicit timezone offset (+05:30) is preserved
    const parsedOffset = parseBusinessDateTime('2026-10-24T15:35:00+05:30');
    expect(parsedOffset.toISOString()).toBe('2026-10-24T10:05:00.000Z');

    // Invalid input handling
    expect(parseBusinessDateTime(null)).toBeNull();
    expect(parseBusinessDateTime('')).toBeNull();
    expect(() => parseBusinessDateTime('not-a-date')).toThrow();
  });
});
