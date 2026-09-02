import { useState } from 'react';
import { useStore } from '../hooks/useStore';
import { todayISO } from '../lib/format';
import { completedToday, computeStreak, last7Days } from '../lib/habits';
import { createId } from '../lib/id';
import { KEYS } from '../lib/schema';
import './HabitsPage.css';

function HabitsPage() {
  const [habits, setHabits] = useStore(KEYS.habits);
  const [title, setTitle] = useState('');

  const days = last7Days();
  const today = todayISO();
  const doneToday = completedToday(habits);

  function addHabit(e) {
    e.preventDefault();
    const name = title.trim();
    if (!name) return;
    setHabits((prev) => [...prev, { id: createId(), title: name, doneDates: [] }]);
    setTitle('');
  }

  function toggleDate(habitId, date) {
    setHabits((prev) =>
      prev.map((habit) =>
        habit.id === habitId
          ? {
              ...habit,
              doneDates: habit.doneDates.includes(date)
                ? habit.doneDates.filter((d) => d !== date)
                : [...habit.doneDates, date],
            }
          : habit,
      ),
    );
  }

  function removeHabit(id) {
    setHabits((prev) => prev.filter((habit) => habit.id !== id));
  }

  return (
    <div className="habits-page">
      <div className="page-header">
        <span className="page-eyebrow">Ritme</span>
        <h1>Habits</h1>
      </div>

      {habits.length > 0 && (
        <p className="habits-today">
          Vandaag <strong>{doneToday}</strong> van {habits.length} afgevinkt
        </p>
      )}

      <form className="habit-form" onSubmit={addHabit}>
        <input
          type="text"
          placeholder="Nieuwe gewoonte (bijv. 30 min sporten)"
          aria-label="Naam van de gewoonte"
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
                        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
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
                      aria-label={`Verwijder ${habit.title}`}
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
                        aria-label={`${habit.title} op ${date}: ${done ? 'voltooid' : 'niet voltooid'}`}
                      >
                        <span aria-hidden="true">{label}</span>
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
