export const todayISO = () => new Date().toISOString().slice(0, 10);

export function formatCurrency(n) {
  return n.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' });
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

export function nextOccurrence(dayOfMonth, from = new Date()) {
  const y = from.getFullYear();
  const m = from.getMonth();
  const today = new Date(y, m, from.getDate());
  const thisMonthDay = Math.min(dayOfMonth, daysInMonth(y, m));
  const thisMonthDate = new Date(y, m, thisMonthDay);
  if (thisMonthDate >= today) return thisMonthDate;
  const nextMonthIndex = m === 11 ? 0 : m + 1;
  const nextMonthYear = m === 11 ? y + 1 : y;
  const nextMonthDay = Math.min(dayOfMonth, daysInMonth(nextMonthYear, nextMonthIndex));
  return new Date(nextMonthYear, nextMonthIndex, nextMonthDay);
}
