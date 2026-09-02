import { useMemo } from 'react';
import { useStore } from '../hooks/useStore';
import { remainingHours, totalTrackedSeconds, upNextCards } from '../lib/board';
import {
  daysUntil,
  formatCurrency,
  formatDuration,
  formatRelativeDays,
  nextOccurrence,
} from '../lib/format';
import { bestStreak, completedToday } from '../lib/habits';
import { KEYS } from '../lib/schema';
import './DashboardPage.css';

function DashboardPage({ onNavigate }) {
  const [entries] = useStore(KEYS.budget);
  const [recurring] = useStore(KEYS.recurring);
  const [board] = useStore(KEYS.board);
  const [notes] = useStore(KEYS.notes);
  const [goals] = useStore(KEYS.goals);
  const [habits] = useStore(KEYS.habits);

  const balance = useMemo(() => {
    return entries.reduce((sum, e) => sum + (e.type === 'income' ? e.amount : -e.amount), 0);
  }, [entries]);

  const outstanding = useMemo(() => remainingHours(board), [board]);
  const tracked = useMemo(() => totalTrackedSeconds(board), [board]);
  const upNext = useMemo(() => upNextCards(board), [board]);

  const nextBills = useMemo(
    () =>
      recurring
        .map((r) => ({ ...r, next: nextOccurrence(r.day) }))
        .sort((a, b) => a.next - b.next)
        .slice(0, 3),
    [recurring],
  );

  const completedGoals = goals.filter((g) => g.current >= g.target).length;
  const streak = bestStreak(habits);
  const habitsToday = completedToday(habits);

  const stats = [
    { tab: 'budget', label: 'Saldo', value: formatCurrency(balance), negative: balance < 0 },
    { tab: 'scrum', label: 'Backlog uren', value: `${outstanding}u` },
    { tab: 'scrum', label: 'Tijd bijgehouden', value: formatDuration(tracked) },
    { tab: 'goals', label: 'Doelen behaald', value: `${completedGoals}/${goals.length}` },
    {
      tab: 'habits',
      label: 'Vandaag afgevinkt',
      value: habits.length ? `${habitsToday}/${habits.length}` : '—',
    },
    { tab: 'habits', label: 'Beste streak', value: `${streak}d` },
    { tab: 'notes', label: 'Notities', value: String(notes.length) },
  ];

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <span className="page-eyebrow">Overzicht</span>
        <h1>Dashboard</h1>
      </div>

      <div className="stat-grid">
        {stats.map((stat) => (
          <button
            type="button"
            className="stat-card"
            key={stat.label}
            onClick={() => onNavigate?.(stat.tab)}
          >
            <span className="stat-label">{stat.label}</span>
            <span className={`stat-value${stat.negative ? ' negative' : ''}`}>{stat.value}</span>
          </button>
        ))}
      </div>

      <div className="dashboard-panels">
        <section className="panel">
          <div className="panel-head">
            <h2>Volgende taken</h2>
            <button type="button" className="panel-link" onClick={() => onNavigate?.('scrum')}>
              Naar bord
            </button>
          </div>
          {upNext.length === 0 ? (
            <p className="empty-state">Niets in Backlog of To Do — het bord is leeg.</p>
          ) : (
            <ul className="panel-list">
              {upNext.map((card) => (
                <li key={card.id}>
                  <span className="panel-item-name">{card.title}</span>
                  <span className={`panel-tag ${card.columnId}`}>
                    {card.columnId === 'todo' ? 'To Do' : 'Backlog'}
                  </span>
                  <span className="panel-item-meta">{card.hours}u</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Binnenkort te betalen</h2>
            <button type="button" className="panel-link" onClick={() => onNavigate?.('budget')}>
              Naar budget
            </button>
          </div>
          {nextBills.length === 0 ? (
            <p className="empty-state">Geen terugkerende kosten ingesteld.</p>
          ) : (
            <ul className="panel-list">
              {nextBills.map((bill) => {
                const days = daysUntil(bill.next);
                return (
                  <li key={bill.id}>
                    <span className="panel-item-name">{bill.name}</span>
                    <span className={`panel-tag due${days <= 3 ? ' soon' : ''}`}>
                      {formatRelativeDays(days)}
                    </span>
                    <span className="panel-item-meta">{formatCurrency(bill.amount)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default DashboardPage;
