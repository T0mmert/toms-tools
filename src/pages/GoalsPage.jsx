import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useLocalStorage } from '../hooks/useLocalStorage';
import './GoalsPage.css';

const EMPTY_FORM = { title: '', target: '', unit: '' };

function GoalsPage() {
  const [goals, setGoals] = useLocalStorage('toms-tools:goals', []);
  const [form, setForm] = useState(EMPTY_FORM);

  function handleSubmit(e) {
    e.preventDefault();
    const target = parseFloat(form.target);
    if (!form.title.trim() || Number.isNaN(target) || target <= 0) return;
    setGoals((prev) => [
      ...prev,
      { id: uuid(), title: form.title.trim(), unit: form.unit.trim(), target, current: 0 },
    ]);
    setForm(EMPTY_FORM);
  }

  function updateCurrent(id, value) {
    const current = parseFloat(value);
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, current: Number.isNaN(current) ? 0 : current } : g)));
  }

  function removeGoal(id) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  return (
    <div className="goals-page">
      <div className="page-header">
        <span className="page-eyebrow">Voortgang</span>
        <h1>Goals</h1>
      </div>

      <form className="goal-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Doel (bijv. Spaardoel vakantie)"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          required
        />
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="Streefwaarde"
          value={form.target}
          onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
          required
        />
        <input
          type="text"
          placeholder="Eenheid (€, u, x)"
          value={form.unit}
          onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
        />
        <button type="submit">Doel toevoegen</button>
      </form>

      {goals.length === 0 ? (
        <p className="empty-state">Nog geen doelen — voeg er hierboven een toe.</p>
      ) : (
        <div className="goals-list">
          {goals.map((goal) => {
            const pct = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
            const complete = pct >= 100;
            return (
              <div className={`goal-card${complete ? ' complete' : ''}`} key={goal.id}>
                <div className="goal-top">
                  <h3>{goal.title}</h3>
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeGoal(goal.id)}
                    aria-label="Verwijderen"
                  >
                    ×
                  </button>
                </div>
                <div className="goal-bar-track">
                  <div className="goal-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="goal-meta">
                  <div className="goal-values">
                    <input
                      type="number"
                      step="0.01"
                      value={goal.current}
                      onChange={(e) => updateCurrent(goal.id, e.target.value)}
                    />
                    <span>
                      / {goal.target} {goal.unit}
                    </span>
                  </div>
                  <span className="goal-pct">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default GoalsPage;
