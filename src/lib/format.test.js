import { describe, expect, it } from 'vitest';
import { addDays, fromLocalISO, shiftMonth, toLocalISO } from './format.js';

describe('test environment', () => {
  it('runs in Europe/Amsterdam so DST tests are deterministic', () => {
    // CET (UTC+1) until the last Sunday of March 2026, CEST (UTC+2) after it.
    expect(new Date(2026, 2, 28, 12).getTimezoneOffset()).toBe(-60);
    expect(new Date(2026, 2, 29, 12).getTimezoneOffset()).toBe(-120);
  });
});

describe('format date helpers', () => {
  it('round-trips a local date key', () => {
    expect(toLocalISO(fromLocalISO('2026-10-25'))).toBe('2026-10-25');
  });

  it('keeps the local day just after midnight', () => {
    // 00:30 CET is 23:30 UTC the day before; toISOString would say 2026-11-01.
    expect(toLocalISO(new Date(2026, 10, 2, 0, 30))).toBe('2026-11-02');
  });

  it('adds days across the October DST change', () => {
    expect(toLocalISO(addDays(fromLocalISO('2026-10-24'), 2))).toBe('2026-10-26');
  });

  it('shifts months across a year boundary', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });
});
