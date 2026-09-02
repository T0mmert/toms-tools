/**
 * Local-calendar date key (YYYY-MM-DD).
 *
 * Deliberately NOT toISOString(): that converts to UTC first, so for a user in
 * CEST anything logged between 00:00 and 02:00 local would be stamped with the
 * previous day. Habit streaks, budget entries and backlog history all key off
 * this, so it has to follow the user's own calendar.
 */
export function toLocalISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const todayISO = () => toLocalISO();

/** Parse a YYYY-MM-DD key back into a local-midnight Date. */
export function fromLocalISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

export function formatCurrency(n) {
  return n.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' });
}

export function formatShortDate(iso) {
  return fromLocalISO(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}u ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, '0')}s`;
  return `${sec}s`;
}

export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/** Next calendar occurrence of a day-of-month, clamped for short months. */
export function nextOccurrence(dayOfMonth, from = new Date()) {
  const y = from.getFullYear();
  const m = from.getMonth();
  const today = new Date(y, m, from.getDate());
  const thisMonthDate = new Date(y, m, Math.min(dayOfMonth, daysInMonth(y, m)));
  if (thisMonthDate >= today) return thisMonthDate;

  const nextMonth = m === 11 ? 0 : m + 1;
  const nextYear = m === 11 ? y + 1 : y;
  return new Date(nextYear, nextMonth, Math.min(dayOfMonth, daysInMonth(nextYear, nextMonth)));
}

/** Month key (YYYY-MM) for grouping, in local time. */
export function toMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonth(monthKey, delta) {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return toMonthKey(d);
}

export function formatMonth(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
}

export function daysUntil(date) {
  return Math.round((date - startOfToday()) / 86400000);
}

export function formatRelativeDays(days) {
  if (days <= 0) return 'Vandaag';
  if (days === 1) return 'Morgen';
  return `Over ${days} dagen`;
}
