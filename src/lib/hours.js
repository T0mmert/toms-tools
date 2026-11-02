import { addDays, daysInMonth, fromLocalISO, toLocalISO } from './format';

/**
 * Worked-hours log for HB shifts.
 *
 * The log is the source of truth; Google Calendar is only where planned shifts
 * come from. One row per shift:
 *   { id, date, start, end, plannedHours, workedHours, status, confirmed,
 *     source, missingFromCalendar, note }
 * `date` is the local day the shift starts, so a night shift counts for the
 * evening it began. `start`/`end` are ISO instants; durations are computed
 * from milliseconds, which keeps midnight and DST changes exact.
 */
export const STATUSES = ['planned', 'worked', 'skipped'];

const HOUR_MS = 3_600_000;

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isoDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isInstant = (v) => typeof v === 'string' && Number.isFinite(Date.parse(v));
const nonNegative = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
const byStart = (a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0);

export function shiftDurationHours(start, end, breakMinutes = 0) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, ms / HOUR_MS - breakMinutes / 60);
}

export const roundQuarter = (hours) => Math.round(hours * 4) / 4;

export function grossPay(hours, rate, vakantiegeldPct) {
  return hours * rate * (1 + vakantiegeldPct / 100);
}

export const isToConfirm = (row) => row.status === 'worked' && !row.confirmed;

/** Repairs a stored log: drops unusable rows, keeps the last row per id. */
export function normalizeShifts(value) {
  if (!Array.isArray(value)) return [];
  const byId = new Map();
  value.forEach((row) => {
    if (!isObject(row) || typeof row.id !== 'string' || !row.id) return;
    if (!isoDate(row.date) || !isInstant(row.start) || !isInstant(row.end)) return;
    const plannedHours = nonNegative(row.plannedHours) ?? 0;
    byId.set(row.id, {
      id: row.id,
      date: row.date,
      start: row.start,
      end: row.end,
      plannedHours,
      workedHours: nonNegative(row.workedHours) ?? plannedHours,
      status: STATUSES.includes(row.status) ? row.status : 'planned',
      confirmed: row.confirmed === true,
      source: row.source === 'manual' ? 'manual' : 'calendar',
      missingFromCalendar: row.missingFromCalendar === true,
      note: typeof row.note === 'string' ? row.note : '',
    });
  });
  return [...byId.values()].sort(byStart);
}

/** Planned shifts whose end has passed become worked, awaiting confirmation. */
export function settleStatuses(log, now = new Date()) {
  const nowMs = new Date(now).getTime();
  let changed = false;
  const next = log.map((row) => {
    if (row.status !== 'planned' || new Date(row.end).getTime() >= nowMs) return row;
    changed = true;
    return { ...row, status: 'worked' };
  });
  return changed ? next : log;
}

/**
 * Upsert calendar events into the log.
 *
 * Confirmed rows are never touched. Unconfirmed rows follow the calendar's
 * times, keeping a hand-edited worked figure. An unconfirmed calendar row that
 * is absent from `fetched` although it falls inside the fetched window is
 * flagged, not deleted. Running the same merge twice changes nothing.
 */
export function mergeCalendarShifts(log, fetched, { now = new Date(), from, to, breakMinutes = 0 } = {}) {
  const byId = new Map(log.map((row) => [row.id, row]));
  const seen = new Set();

  fetched.forEach((event) => {
    const start = new Date(event.start).toISOString();
    const end = new Date(event.end).toISOString();
    const plannedHours = shiftDurationHours(start, end, breakMinutes);
    const date = toLocalISO(new Date(start));
    const row = byId.get(event.id);
    seen.add(event.id);

    if (!row) {
      byId.set(event.id, {
        id: event.id,
        date,
        start,
        end,
        plannedHours,
        workedHours: plannedHours,
        status: 'planned',
        confirmed: false,
        source: 'calendar',
        missingFromCalendar: false,
        note: '',
      });
      return;
    }
    if (row.confirmed) return;
    const edited = row.workedHours !== row.plannedHours;
    byId.set(event.id, {
      ...row,
      date,
      start,
      end,
      plannedHours,
      workedHours: edited ? row.workedHours : plannedHours,
      missingFromCalendar: false,
    });
  });

  const fromMs = from ? new Date(from).getTime() : -Infinity;
  const toMs = to ? new Date(to).getTime() : Infinity;
  const flagged = [...byId.values()].map((row) => {
    if (row.source !== 'calendar' || row.confirmed || seen.has(row.id) || row.missingFromCalendar) return row;
    const startMs = new Date(row.start).getTime();
    return startMs >= fromMs && startMs < toMs ? { ...row, missingFromCalendar: true } : row;
  });

  return settleStatuses(flagged, now).sort(byStart);
}

/** A shift typed in by hand. An end at or before the start is a night shift. */
export function manualShift({ date, startTime, endTime, note = '' }, { id, now = new Date(), breakMinutes = 0 }) {
  const day = fromLocalISO(date);
  const at = (time, dayOffset) => {
    const [h, m] = time.split(':').map(Number);
    return new Date(day.getFullYear(), day.getMonth(), day.getDate() + dayOffset, h, m);
  };
  const start = at(startTime, 0);
  let end = at(endTime, 0);
  if (end <= start) end = at(endTime, 1);

  const past = end.getTime() < new Date(now).getTime();
  return {
    id,
    date,
    start: start.toISOString(),
    end: end.toISOString(),
    plannedHours: 0,
    workedHours: roundQuarter(shiftDurationHours(start, end, breakMinutes)),
    status: past ? 'worked' : 'planned',
    // Typed in by the person who worked it, after the fact: nothing to check.
    confirmed: past,
    source: 'manual',
    missingFromCalendar: false,
    note: note.trim(),
  };
}

/** Quarter-hour edit. Changing a worked shift needs a fresh confirmation. */
export function adjustWorked(row, delta) {
  return {
    ...row,
    workedHours: Math.max(0, roundQuarter(row.workedHours + delta)),
    confirmed: row.status === 'worked' ? false : row.confirmed,
  };
}

export function restoreShift(row, now = new Date()) {
  const past = new Date(row.end).getTime() < new Date(now).getTime();
  return { ...row, status: past ? 'worked' : 'planned', confirmed: false };
}

function summarize(rows) {
  return rows.reduce(
    (totals, row) => {
      if (row.status === 'worked') totals.worked += row.workedHours;
      else if (row.status === 'planned') totals.planned += row.workedHours;
      if (isToConfirm(row)) totals.toConfirm += 1;
      return totals;
    },
    { worked: 0, planned: 0, toConfirm: 0 },
  );
}

export function monthTotals(log, monthKey) {
  return summarize(log.filter((row) => row.date.startsWith(`${monthKey}-`)));
}

export function startOfIsoWeek(date) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return addDays(day, -((day.getDay() + 6) % 7));
}

export function weekTotals(log, date) {
  const monday = startOfIsoWeek(date);
  const first = toLocalISO(monday);
  const last = toLocalISO(addDays(monday, 6));
  return summarize(log.filter((row) => row.date >= first && row.date <= last));
}

/** ISO 8601 week: Monday start, week 1 holds the year's first Thursday. */
export function isoWeek(date) {
  const monday = startOfIsoWeek(date);
  const year = addDays(monday, 3).getFullYear();
  const firstMonday = startOfIsoWeek(new Date(year, 0, 4));
  // Rounded, because a DST change makes one week an hour short or long.
  const week = 1 + Math.round((monday - firstMonday) / (7 * 24 * HOUR_MS));
  return { year, week };
}

/** Per-day worked and planned hours for the month's bar chart. */
export function dailyHours(log, monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return Array.from({ length: daysInMonth(y, m - 1) }, (_, i) => {
    const date = `${monthKey}-${String(i + 1).padStart(2, '0')}`;
    const totals = summarize(log.filter((row) => row.date === date));
    return { day: i + 1, date, worked: totals.worked, planned: totals.planned };
  });
}

/** Shifts grouped per ISO week, newest week and newest shift first. */
export function groupByWeek(shifts) {
  const groups = new Map();
  shifts.forEach((row) => {
    const day = fromLocalISO(row.date);
    const { year, week } = isoWeek(day);
    const key = `${year}-W${String(week).padStart(2, '0')}`;
    if (!groups.has(key)) {
      groups.set(key, { key, monday: toLocalISO(startOfIsoWeek(day)), weekNumber: week, items: [], hours: 0, toConfirm: 0 });
    }
    const group = groups.get(key);
    group.items.push(row);
    if (row.status === 'worked') group.hours += row.workedHours;
    if (isToConfirm(row)) group.toConfirm += 1;
  });
  return [...groups.values()]
    .sort((a, b) => (a.monday < b.monday ? 1 : -1))
    .map((group) => ({ ...group, items: group.items.sort((a, b) => byStart(b, a)) }));
}

const CSV_STATUS = { planned: 'gepland', worked: 'gewerkt', skipped: 'overgeslagen' };

function csvCell(value) {
  let text = String(value);
  // A leading = + - @ makes spreadsheet apps evaluate the cell as a formula.
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Excel-friendly CSV: `;` separator, decimal comma, UTF-8 BOM. */
export function shiftsToCsv(rows) {
  const time = (iso) => new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  const hours = (n) => String(Math.round(n * 100) / 100).replace('.', ',');
  const lines = ['datum;start;einde;uren;status;notitie'];
  [...rows].sort(byStart).forEach((row) => {
    const worked = row.status === 'skipped' ? 0 : row.workedHours;
    lines.push(
      [row.date, time(row.start), time(row.end), hours(worked), CSV_STATUS[row.status], row.note].map(csvCell).join(';'),
    );
  });
  return `﻿${lines.join('\r\n')}\r\n`;
}
