import { useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { formatCurrency, formatDuration } from '../lib/format';
import './DashboardPage.css';

const EMPTY_BOARD = {
  cards: {},
  columnOrder: ['backlog', 'todo', 'inprogress', 'done'],
  columns: {
    backlog: { id: 'backlog', title: 'Backlog', cardIds: [] },
    todo: { id: 'todo', title: 'To Do', cardIds: [] },
    inprogress: { id: 'inprogress', title: 'In Progress', cardIds: [] },
    done: { id: 'done', title: 'Done', cardIds: [] },
  },
};

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

function DashboardPage() {
  const [entries] = useLocalStorage('toms-tools:budget', []);
  const [board] = useLocalStorage('toms-tools:scrum-board', EMPTY_BOARD);
  const [notes] = useLocalStorage('toms-tools:notes', []);
  const [goals] = useLocalStorage('toms-tools:goals', []);
  const [habits] = useLocalStorage('toms-tools:habits', []);

  const balance = useMemo(() => {
    const income = entries.filter((e) => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const expenses = entries.filter((e) => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
    return income - expenses;
  }, [entries]);

  const { remainingHours, trackedSeconds, upNext } = useMemo(() => {
    const cards = Object.values(board.cards || {});
    const remaining = board.columnOrder
      .filter((colId) => colId !== 'done')
      .reduce((sum, colId) => {
        const col = board.columns[colId];
        return sum + col.cardIds.reduce((s, cardId) => s + (board.cards[cardId]?.hours || 0), 0);
      }, 0);
    const tracked = cards.reduce((sum, c) => sum + (c.trackedSeconds || 0), 0);

    const next = [];
    ['todo', 'backlog'].forEach((colId) => {
      board.columns[colId]?.cardIds.forEach((cardId) => {
        if (next.length < 4 && board.cards[cardId]) next.push(board.cards[cardId]);
      });
    });

    return { remainingHours: remaining, trackedSeconds: tracked, upNext: next };
  }, [board]);

  const completedGoals = goals.filter((g) => g.current >= g.target).length;
  const bestStreak = habits.reduce((best, h) => Math.max(best, computeStreak(h.doneDates)), 0);

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <span className="page-eyebrow">Overzicht</span>
        <h1>Dashboard</h1>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Saldo</span>
          <span className={`stat-value${balance < 0 ? ' negative' : ''}`}>{formatCurrency(balance)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Backlog uren</span>
          <span className="stat-value">{remainingHours}u</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Tijd bijgehouden</span>
          <span className="stat-value">{formatDuration(trackedSeconds)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Doelen</span>
          <span className="stat-value">
            {completedGoals}/{goals.length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Notities</span>
          <span className="stat-value">{notes.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Beste streak</span>
          <span className="stat-value">{bestStreak}d</span>
        </div>
      </div>

      <div className="up-next">
        <h2>Volgende taken</h2>
        {upNext.length === 0 ? (
          <p className="empty-state">Niets in Backlog of To Do — het Scrum Board is leeg.</p>
        ) : (
          <ul className="up-next-list">
            {upNext.map((card) => (
              <li key={card.id}>
                <span>{card.title}</span>
                <span className="up-next-hours">{card.hours}u</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
