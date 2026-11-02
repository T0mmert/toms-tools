import { useEffect, useMemo, useRef, useState } from 'react';
import PageIcon from '../components/PageIcon';
import { useStore } from '../hooks/useStore';
import { remainingHours } from '../lib/board';
import { daysUntil, formatHours, nextOccurrence, toMonthKey } from '../lib/format';
import { bestStreak } from '../lib/habits';
import { monthTotals, settleStatuses } from '../lib/hours';
import { KEYS } from '../lib/schema';
import './StartPage.css';

const SEARCH_ICON = 'M9 3.5a5.5 5.5 0 1 0 0 11a5.5 5.5 0 0 0 0-11ZM13.2 13.2L17 17';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** One live line per page tile, read straight from the stores. */
function useTileStats() {
  const [board] = useStore(KEYS.board);
  const [recurring] = useStore(KEYS.recurring);
  const [goals] = useStore(KEYS.goals);
  const [habits] = useStore(KEYS.habits);
  const [notes] = useStore(KEYS.notes);
  const [shifts] = useStore(KEYS.hours);

  return useMemo(() => {
    const dueSoon = recurring.filter((bill) => daysUntil(nextOccurrence(bill.day)) <= 7).length;
    const month = toMonthKey();
    const settled = settleStatuses(shifts);
    const hours = monthTotals(settled, month);
    const anyShifts = settled.some((row) => row.date.startsWith(`${month}-`));
    const goalsDone = goals.filter((goal) => goal.current >= goal.target).length;
    const streak = bestStreak(habits);
    return {
      hours: anyShifts
        ? `${formatHours(hours.worked)} gewerkt${hours.toConfirm ? `, ${hours.toConfirm} te bevestigen` : ' deze maand'}`
        : 'Nog geen diensten deze maand',
      scrum: `${formatHours(remainingHours(board))} in backlog`,
      budget: recurring.length
        ? dueSoon
          ? `${plural(dueSoon, 'rekening', 'rekeningen')} binnenkort`
          : 'Niets binnenkort te betalen'
        : 'Nog geen vaste lasten',
      goals: goals.length ? `${goalsDone} van ${goals.length} behaald` : 'Nog geen doelen',
      habits: habits.length ? `Beste streak: ${plural(streak, 'dag', 'dagen')}` : 'Nog geen gewoontes',
      notes: plural(notes.length, 'notitie', 'notities'),
    };
  }, [board, recurring, goals, habits, notes, shifts]);
}

/** What an empty tab shows: search, quick actions and a tile per page. */
function StartPage({ pages, actions, onOpen }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const stats = useTileStats();

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const q = query.trim().toLowerCase();
  const quick = actions.filter((action) => !q || action.label.toLowerCase().includes(q));
  const tiles = pages.filter((page) => !page.pinned && (!q || page.label.toLowerCase().includes(q)));

  function onKeyDown(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (quick.length) onOpen(quick[0].page, quick[0].id);
    else if (tiles.length) onOpen(tiles[0].id);
  }

  return (
    <div className="start-page">
      <div className="start-head">
        <span className="start-eyebrow">Nieuw tabblad</span>
        <h1>Waar wil je heen?</h1>
      </div>

      <label className="start-search glass">
        <PageIcon d={SEARCH_ICON} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Zoek een pagina of actie"
          aria-label="Zoek een pagina of actie"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <kbd>Ctrl K</kbd>
      </label>

      {quick.length > 0 && (
        <section aria-labelledby="start-quick">
          <h2 className="start-section" id="start-quick">
            Snel starten
          </h2>
          <div className="start-quick">
            {quick.map((action) => (
              <button
                type="button"
                key={action.id}
                className="start-action glass"
                onClick={() => onOpen(action.page, action.id)}
              >
                <PageIcon d={action.icon} strokeWidth={1.7} />
                {action.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="start-pages">
        <h2 className="start-section" id="start-pages">
          Pagina&apos;s
        </h2>
        {tiles.length > 0 ? (
          <div className="start-tiles">
            {tiles.map((page) => (
              <button type="button" key={page.id} className="start-tile glass" onClick={() => onOpen(page.id)}>
                <span className="start-tile-icon">
                  <PageIcon d={page.icon} />
                </span>
                <span className="start-tile-name">{page.label}</span>
                {stats[page.id] && <span className="start-tile-stat">{stats[page.id]}</span>}
              </button>
            ))}
          </div>
        ) : (
          <p className="start-empty">Niets gevonden voor deze zoekopdracht.</p>
        )}
      </section>
    </div>
  );
}

export default StartPage;
