import { addDays, toLocalISO } from './format';

const DAY_LABELS = ['Z', 'M', 'D', 'W', 'D', 'V', 'Z'];

/** The rolling 7-day window ending today, each with its real weekday letter. */
export function last7Days(from = new Date()) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(from, -i);
    days.push({ date: toLocalISO(d), label: DAY_LABELS[d.getDay()] });
  }
  return days;
}

/**
 * Consecutive days completed, counting back from today. Today not being ticked
 * yet does not break a streak — the count simply starts at yesterday.
 */
export function computeStreak(doneDates, from = new Date()) {
  const done = new Set(doneDates);
  let cursor = from;
  if (!done.has(toLocalISO(cursor))) cursor = addDays(cursor, -1);

  let streak = 0;
  while (done.has(toLocalISO(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function bestStreak(habits) {
  return habits.reduce((best, habit) => Math.max(best, computeStreak(habit.doneDates)), 0);
}

export function completedToday(habits) {
  const today = toLocalISO();
  return habits.filter((habit) => habit.doneDates.includes(today)).length;
}
