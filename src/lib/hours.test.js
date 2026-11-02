import { describe, expect, it } from 'vitest';
import {
  adjustWorked,
  dailyHours,
  grossPay,
  groupByWeek,
  isoWeek,
  manualShift,
  mergeCalendarShifts,
  monthTotals,
  normalizeShifts,
  restoreShift,
  shiftDurationHours,
  shiftsToCsv,
  weekTotals,
} from './hours.js';

// Local wall-clock instants (the suite runs in Europe/Amsterdam).
const at = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi);
const iso = (...args) => at(...args).toISOString();

function row(overrides) {
  return {
    id: 'e1',
    date: '2026-10-29',
    start: iso(2026, 10, 29, 18),
    end: iso(2026, 10, 30, 0, 30),
    plannedHours: 6.5,
    workedHours: 6.5,
    status: 'worked',
    confirmed: false,
    source: 'calendar',
    missingFromCalendar: false,
    note: '',
    ...overrides,
  };
}

describe('shiftDurationHours', () => {
  it('handles a shift across midnight', () => {
    expect(shiftDurationHours(at(2026, 10, 29, 18), at(2026, 10, 30, 0, 30))).toBe(6.5);
  });

  it('counts the real hours across the October DST change', () => {
    // 22:00 CEST to 06:00 CET is nine hours on the clock-back night.
    expect(shiftDurationHours(at(2026, 10, 24, 22), at(2026, 10, 25, 6))).toBe(9);
  });

  it('counts the real hours across the March DST change', () => {
    expect(shiftDurationHours(at(2026, 3, 28, 22), at(2026, 3, 29, 6))).toBe(7);
  });

  it('subtracts an unpaid break and never goes negative', () => {
    expect(shiftDurationHours(at(2026, 10, 29, 18), at(2026, 10, 29, 24), 30)).toBe(5.5);
    expect(shiftDurationHours(at(2026, 10, 29, 18), at(2026, 10, 29, 18, 10), 30)).toBe(0);
  });
});

describe('mergeCalendarShifts', () => {
  const now = at(2026, 10, 31, 12);
  const window = { now, from: at(2026, 9, 1), to: at(2026, 12, 1) };
  const event = { id: 'e1', title: 'HB Werk', start: iso(2026, 10, 29, 18), end: iso(2026, 10, 30, 0, 30) };

  it('adds new shifts and marks past ones as worked', () => {
    const [shift] = mergeCalendarShifts([], [event], window);
    expect(shift).toMatchObject({ id: 'e1', date: '2026-10-29', plannedHours: 6.5, workedHours: 6.5, status: 'worked', confirmed: false });
  });

  it('keeps future shifts planned', () => {
    const future = { ...event, id: 'e2', start: iso(2026, 11, 3, 18), end: iso(2026, 11, 3, 23) };
    expect(mergeCalendarShifts([], [future], window)[0].status).toBe('planned');
  });

  it('is idempotent', () => {
    const once = mergeCalendarShifts([], [event], window);
    expect(mergeCalendarShifts(once, [event], window)).toEqual(once);
  });

  it('never touches confirmed rows', () => {
    const confirmed = row({ confirmed: true, workedHours: 7 });
    const moved = { ...event, start: iso(2026, 10, 29, 17) };
    expect(mergeCalendarShifts([confirmed], [moved], window)[0]).toEqual(confirmed);
  });

  it('follows calendar changes on unconfirmed rows but keeps a hand-edited worked figure', () => {
    const edited = row({ workedHours: 7 });
    const moved = { ...event, start: iso(2026, 10, 29, 17) };
    const [shift] = mergeCalendarShifts([edited], [moved], window);
    expect(shift.plannedHours).toBe(7.5);
    expect(shift.workedHours).toBe(7);
  });

  it('flags unconfirmed rows that vanished inside the window, never deletes them', () => {
    const gone = row({ id: 'gone' });
    const outside = row({ id: 'old', date: '2026-08-01', start: iso(2026, 8, 1, 18), end: iso(2026, 8, 1, 23) });
    const confirmed = row({ id: 'kept', confirmed: true });
    const result = mergeCalendarShifts([gone, outside, confirmed], [], window);
    expect(result.find((r) => r.id === 'gone').missingFromCalendar).toBe(true);
    expect(result.find((r) => r.id === 'old').missingFromCalendar).toBe(false);
    expect(result.find((r) => r.id === 'kept').missingFromCalendar).toBe(false);
    expect(result).toHaveLength(3);
  });

  it('leaves manual rows alone', () => {
    const manual = row({ id: 'm-1', source: 'manual' });
    expect(mergeCalendarShifts([manual], [], window)[0]).toEqual(manual);
  });
});

describe('totals', () => {
  const log = [
    row({ id: 'a', date: '2026-10-01', workedHours: 6, status: 'worked', confirmed: true }),
    row({ id: 'b', date: '2026-10-02', workedHours: 5.5, status: 'worked' }),
    row({ id: 'c', date: '2026-10-03', workedHours: 6, status: 'skipped' }),
    row({ id: 'd', date: '2026-10-31', workedHours: 6, status: 'planned' }),
    row({ id: 'e', date: '2026-11-01', workedHours: 4, status: 'worked' }),
  ];

  it('sums a month, excluding skipped shifts', () => {
    expect(monthTotals(log, '2026-10')).toEqual({ worked: 11.5, planned: 6, toConfirm: 1 });
  });

  it('sums an ISO week across a month boundary', () => {
    // Monday 26 Oct to Sunday 1 Nov.
    expect(weekTotals(log, at(2026, 10, 28))).toEqual({ worked: 4, planned: 6, toConfirm: 1 });
  });

  it('lists every day of the month', () => {
    const days = dailyHours(log, '2026-10');
    expect(days).toHaveLength(31);
    expect(days[1]).toMatchObject({ date: '2026-10-02', worked: 5.5 });
    expect(days[30]).toMatchObject({ planned: 6 });
  });

  it('computes gross pay with vakantiegeld', () => {
    expect(grossPay(72, 18.7, 8)).toBeCloseTo(1454.112, 3);
  });
});

describe('isoWeek and groupByWeek', () => {
  it('numbers weeks across the year boundary', () => {
    expect(isoWeek(at(2025, 12, 29))).toEqual({ year: 2026, week: 1 });
    expect(isoWeek(at(2026, 12, 31))).toEqual({ year: 2026, week: 53 });
    expect(isoWeek(at(2027, 1, 1))).toEqual({ year: 2026, week: 53 });
    expect(isoWeek(at(2027, 1, 4))).toEqual({ year: 2027, week: 1 });
  });

  it('numbers the week after the DST change correctly', () => {
    expect(isoWeek(at(2026, 10, 26))).toEqual({ year: 2026, week: 44 });
  });

  it('groups newest week first with totals and open confirmations', () => {
    const groups = groupByWeek([
      row({ id: 'a', date: '2026-10-29', workedHours: 6.5, start: iso(2026, 10, 29, 18) }),
      row({ id: 'b', date: '2026-11-01', workedHours: 6, start: iso(2026, 11, 1, 18), confirmed: true }),
      row({ id: 'c', date: '2026-10-25', workedHours: 6, start: iso(2026, 10, 25, 18) }),
      row({ id: 'd', date: '2026-10-31', workedHours: 6, status: 'planned', start: iso(2026, 10, 31, 20) }),
    ]);
    expect(groups.map((g) => g.weekNumber)).toEqual([44, 43]);
    expect(groups[0]).toMatchObject({ monday: '2026-10-26', hours: 12.5, toConfirm: 1 });
    expect(groups[0].items.map((r) => r.id)).toEqual(['b', 'd', 'a']);
  });
});

describe('manual shifts and edits', () => {
  const now = at(2027, 1, 2, 12);

  it('counts a night shift for its start day and rounds to a quarter hour', () => {
    const shift = manualShift({ date: '2026-12-31', startTime: '22:00', endTime: '02:00' }, { id: 'm-1', now });
    expect(shift).toMatchObject({ date: '2026-12-31', workedHours: 4, status: 'worked', confirmed: true, source: 'manual' });
    const odd = manualShift({ date: '2026-10-29', startTime: '18:00', endTime: '00:20' }, { id: 'm-2', now });
    expect(odd.workedHours).toBe(6.25);
  });

  it('plans a future manual shift without confirming it', () => {
    const shift = manualShift({ date: '2027-01-05', startTime: '18:00', endTime: '23:00' }, { id: 'm-3', now });
    expect(shift).toMatchObject({ status: 'planned', confirmed: false });
  });

  it('needs a fresh confirmation after editing a worked shift', () => {
    const edited = adjustWorked(row({ confirmed: true }), 0.25);
    expect(edited).toMatchObject({ workedHours: 6.75, confirmed: false });
    expect(adjustWorked(row({ workedHours: 0 }), -0.25).workedHours).toBe(0);
  });

  it('restores a skipped shift to worked or planned by its end time', () => {
    expect(restoreShift(row({ status: 'skipped' }), now).status).toBe('worked');
    expect(restoreShift(row({ status: 'skipped', end: iso(2027, 2, 1) }), now).status).toBe('planned');
  });
});

describe('normalizeShifts', () => {
  it('drops unusable rows, repairs fields and keeps the last row per id', () => {
    const result = normalizeShifts([
      'x',
      { id: 'bad', date: 'nope', start: iso(2026, 10, 1), end: iso(2026, 10, 1, 6) },
      row({ id: 'a', workedHours: 1 }),
      row({ id: 'a', workedHours: -3, status: 'odd', note: 5 }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'a', workedHours: 6.5, status: 'planned', note: '' });
    expect(normalizeShifts('x')).toEqual([]);
  });
});

describe('shiftsToCsv', () => {
  it('writes Dutch CSV with a BOM, decimal comma and zero hours for skipped shifts', () => {
    const csv = shiftsToCsv([
      row({ note: 'langer doorgewerkt' }),
      row({ id: 'b', date: '2026-10-30', start: iso(2026, 10, 30, 19), end: iso(2026, 10, 31, 1), status: 'skipped', workedHours: 6 }),
    ]);
    const lines = csv.slice(1).trim().split('\r\n');
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(lines[0]).toBe('datum;start;einde;uren;status;notitie');
    expect(lines[1]).toBe('2026-10-29;18:00;00:30;6,5;gewerkt;langer doorgewerkt');
    expect(lines[2]).toBe('2026-10-30;19:00;01:00;0;overgeslagen;');
  });

  it('quotes separators and defuses formulas in notes', () => {
    const csv = shiftsToCsv([row({ note: '=1+1; "x"' })]);
    expect(csv).toContain(`"'=1+1; ""x"""`);
  });
});
