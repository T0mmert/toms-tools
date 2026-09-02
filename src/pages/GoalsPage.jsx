import { useState } from 'react';
import { useStore } from '../hooks/useStore';
import { createId } from '../lib/id';
import { KEYS } from '../lib/schema';
import './GoalsPage.css';

const EMPTY_FORM = { title: '', target: '', unit: '' };

function GoalsPage() {
  const [goals, setGoals] = useStore(KEYS.goals);
  const [form, setForm] = useState(EMPTY_FORM);
  // Holds what is literally typed in a progress field while it is being edited,
  // so the value can be cleared and retyped without snapping back to 0.
  const [drafts, setDrafts] = useState({});

  function handleSubmit(e) {
    e.preventDefault();
    const target = parseFloat(form.target);
    const title = form.title.trim();
    if (!title || !Number.isFinite(target) || target <= 0) return;

    setGoals((prev) => [
      ...prev,
      { id: createId(), title, unit: form.unit.trim(), target, current: 0 },
    ]);
    setForm(EMPTY_FORM);
  }

  function handleCurrentChange(id, raw) {
    setDrafts((prev) => ({ ...prev, [id]: raw }));
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed)) return;
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, current: Math.max(0, parsed) } : g)));
  }

  function handleCurrentBlur(id) {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
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
          aria-label="Naam van het doel"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          required
        />
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="Streefwaarde"
          aria-label="Streefwaarde"
          value={form.target}
          onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
          required
        />
        <input
          type="text"
          placeholder="Eenheid (€, u, x)"
          aria-label="Eenheid"
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
            const raw = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
            const pct = Math.max(0, Math.min(100, Math.round(raw)));
            const complete = pct >= 100;
            return (
              <div className={`goal-card${complete ? ' complete' : ''}`} key={goal.id}>
                <div className="goal-top">
                  <h3>{goal.title}</h3>
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeGoal(goal.id)}
                    aria-label={`Verwijder ${goal.title}`}
                  >
                    ×
                  </button>
                </div>
                <div
                  className="goal-bar-track"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Voortgang ${goal.title}`}
                >
                  <div className="goal-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="goal-meta">
                  <div className="goal-values">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      aria-label={`Huidige waarde voor ${goal.title}`}
                      value={drafts[goal.id] ?? goal.current}
                      onChange={(e) => handleCurrentChange(goal.id, e.target.value)}
                      onBlur={() => handleCurrentBlur(goal.id)}
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
