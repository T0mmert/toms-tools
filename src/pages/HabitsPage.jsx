import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { todayISO } from '../lib/format';
import './HabitsPage.css';

const DAY_LABELS = ['Z', 'M', 'D', 'W', 'D', 'V', 'Z'];

function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ date: d.toISOString().slice(0, 10), label: DAY_LABELS[d.getDay()] });
  }
  return days;
}

function computeStreak(doneDates) {
  const set = new Set(doneDates);
  const cursor = new Date();
  if (!set.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function HabitsPage() {
  const [habits, setHabits] = useLocalStorage('toms-tools:habits', []);
  const [title, setTitle] = useState('');
  const days = last7Days();
  const today = todayISO();

  function addHabit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setHabits((prev) => [...prev, { id: uuid(), title: title.trim(), doneDates: [] }]);
    setTitle('');
  }

  function toggleDate(habitId, date) {
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habitId
          ? {
              ...h,
              doneDates: h.doneDates.includes(date)
                ? h.doneDates.filter((d) => d !== date)
                : [...h.doneDates, date],
            }
          : h,
      ),
    );
  }

  function removeHabit(id) {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }

  return (
    <div className="habits-page">
      <div className="page-header">
        <span className="page-eyebrow">Ritme</span>
        <h1>Habits</h1>
      </div>

      <form className="habit-form" onSubmit={addHabit}>
        <input
          type="text"
          placeholder="Nieuwe gewoonte (bijv. 30 min sporten)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <button type="submit">Toevoegen</button>
      </form>

      {habits.length === 0 ? (
        <p className="empty-state">Nog geen gewoontes — voeg er hierboven een toe.</p>
      ) : (
        <div className="habits-list">
          {habits.map((habit) => {
            const streak = computeStreak(habit.doneDates);
            return (
              <div className="habit-card" key={habit.id}>
                <div className="habit-top">
                  <h3>{habit.title}</h3>
                  <div className="habit-top-right">
                    {streak > 0 && (
                      <span className="habit-streak">
                        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M10 2.5c1.2 2 3.2 4.1 3.2 7a3.2 3.2 0 0 1-6.4 0c0-.9.3-1.6.7-2.2.1 1 .8 1.7 1.5 1.5.6-.2.7-1 .3-1.7C8.4 5.8 9.4 4 10 2.5Z"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {streak} {streak === 1 ? 'dag' : 'dagen'} op rij
                      </span>
                    )}
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => removeHabit(habit.id)}
                      aria-label="Verwijderen"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="habit-days">
                  {days.map(({ date, label }) => {
                    const done = habit.doneDates.includes(date);
                    return (
                      <button
                        key={date}
                        type="button"
                        className={`habit-day${done ? ' done' : ''}${date === today ? ' today' : ''}`}
                        onClick={() => toggleDate(habit.id, date)}
                        aria-pressed={done}
                        aria-label={`${date}${done ? ' voltooid' : ' niet voltooid'}`}
                        title={date}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default HabitsPage;
