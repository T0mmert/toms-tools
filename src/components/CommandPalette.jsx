import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../hooks/useStore';
import { formatCurrency } from '../lib/format';
import { KEYS } from '../lib/schema';
import './CommandPalette.css';

const PAGES = [
  { tab: 'dashboard', label: 'Dashboard' },
  { tab: 'scrum', label: 'Scrum Board' },
  { tab: 'budget', label: 'Budget' },
  { tab: 'goals', label: 'Goals' },
  { tab: 'habits', label: 'Habits' },
  { tab: 'notes', label: 'Notes' },
];

/** Mounted only while open, so each launch starts from a clean slate. */
function CommandPalette({ onClose, onNavigate }) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);

  const [board] = useStore(KEYS.board);
  const [notes] = useStore(KEYS.notes);
  const [goals] = useStore(KEYS.goals);
  const [habits] = useStore(KEYS.habits);
  const [recurring] = useStore(KEYS.recurring);

  const items = useMemo(() => {
    const all = PAGES.map((page) => ({
      id: `page-${page.tab}`,
      group: 'Ga naar',
      label: page.label,
      tab: page.tab,
    }));

    Object.values(board.cards).forEach((card) => {
      all.push({
        id: `card-${card.id}`,
        group: 'Taken',
        label: card.title,
        meta: `${card.hours}u`,
        tab: 'scrum',
      });
    });
    notes.forEach((note) => {
      const text = note.text.trim();
      if (!text) return;
      all.push({
        id: `note-${note.id}`,
        group: 'Notities',
        label: text.split('\n')[0].slice(0, 70),
        tab: 'notes',
      });
    });
    goals.forEach((goal) => {
      all.push({
        id: `goal-${goal.id}`,
        group: 'Doelen',
        label: goal.title,
        meta: `${goal.current}/${goal.target} ${goal.unit}`.trim(),
        tab: 'goals',
      });
    });
    habits.forEach((habit) => {
      all.push({ id: `habit-${habit.id}`, group: 'Gewoontes', label: habit.title, tab: 'habits' });
    });
    recurring.forEach((bill) => {
      all.push({
        id: `bill-${bill.id}`,
        group: 'Vaste lasten',
        label: bill.name,
        meta: formatCurrency(bill.amount),
        tab: 'budget',
      });
    });
    return all;
  }, [board, notes, goals, habits, recurring]);

  // Group headers are derived here rather than tracked with a mutable variable
  // during render, which would carry state across renders unpredictably.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? items.filter((item) => item.label.toLowerCase().includes(q)).slice(0, 40)
      : items.filter((item) => item.group === 'Ga naar');

    return matches.map((item, i) => ({
      ...item,
      startsGroup: i === 0 || matches[i - 1].group !== item.group,
    }));
  }, [items, query]);

  useEffect(() => {
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const activeIndex = Math.min(cursor, Math.max(0, results.length - 1));

  function choose(item) {
    if (!item) return;
    onNavigate(item.tab);
    onClose();
  }

  function onInputKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor(Math.min(activeIndex + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor(Math.max(activeIndex - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[activeIndex]);
    }
  }

  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Zoeken"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          className="palette-input"
          placeholder="Zoek taken, notities, doelen…"
          aria-label="Zoekopdracht"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(0);
          }}
          onKeyDown={onInputKeyDown}
        />

        {results.length === 0 ? (
          <p className="palette-empty">Niets gevonden voor “{query}”.</p>
        ) : (
          <ul className="palette-results">
            {results.map((item, i) => (
              <li key={item.id}>
                {item.startsGroup && <span className="palette-group">{item.group}</span>}
                <button
                  type="button"
                  className={`palette-item${i === activeIndex ? ' active' : ''}`}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => choose(item)}
                >
                  <span className="palette-label">{item.label}</span>
                  {item.meta && <span className="palette-meta">{item.meta}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="palette-hint">
          <kbd>↑</kbd>
          <kbd>↓</kbd> navigeren · <kbd>Enter</kbd> openen · <kbd>Esc</kbd> sluiten
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
