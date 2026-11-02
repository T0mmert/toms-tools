import { describe, expect, it } from 'vitest';
import { addDays, formatEuros, formatHours, fromLocalISO, shiftMonth, toLocalISO } from './format.js';

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

describe('format numbers', () => {
  it('writes hours with a decimal comma and at most two decimals', () => {
    expect(formatHours(6.5)).toBe('6,5u');
    expect(formatHours(72)).toBe('72u');
    expect(formatHours(12.333)).toBe('12,33u');
  });

  it('rounds euros to whole amounts', () => {
    expect(formatEuros(1454.4).replace(/\s/g, ' ')).toBe('€ 1.454');
  });
});
