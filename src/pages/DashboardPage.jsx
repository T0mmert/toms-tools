import { useMemo } from 'react';
import CalendarCard from '../components/CalendarCard';
import DashboardAtmosphere from '../components/DashboardAtmosphere';
import LiquidGlassFilter from '../components/LiquidGlassFilter';
import NewsCard from '../components/NewsCard';
import WeatherCard from '../components/WeatherCard';
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

const ICONS = {
  balance: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 8.5H17.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14" cy="12.5" r="1.4" fill="currentColor" />
    </svg>
  ),
  backlog: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="3.5" width="4.5" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="8.5" y="3.5" width="4.5" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14.5" y="3.5" width="3" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6.2V10l2.8 1.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  target: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="3.6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="1" fill="currentColor" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 10.2l2.3 2.3 4.7-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  flame: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 2.5c1.2 2 3.2 4.1 3.2 7a3.2 3.2 0 0 1-6.4 0c0-.9.3-1.6.7-2.2.1 1 .8 1.7 1.5 1.5.6-.2.7-1 .3-1.7C8.4 5.8 9.4 4 10 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M6.8 12.2c-.3.6-.5 1.3-.5 2a3.7 3.7 0 0 0 7.4 0c0-.9-.3-1.7-.7-2.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  notes: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3.5" y="2.5" width="13" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 7H13.5M6.5 10.5H13.5M6.5 14H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

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
    { tab: 'budget', icon: 'balance', label: 'Saldo', value: formatCurrency(balance), negative: balance < 0 },
    { tab: 'scrum', icon: 'backlog', label: 'Backlog uren', value: `${outstanding}u` },
    { tab: 'scrum', icon: 'clock', label: 'Tijd bijgehouden', value: formatDuration(tracked) },
    { tab: 'goals', icon: 'target', label: 'Doelen behaald', value: `${completedGoals}/${goals.length}` },
    {
      tab: 'habits',
      icon: 'check',
      label: 'Vandaag afgevinkt',
      value: habits.length ? `${habitsToday}/${habits.length}` : '—',
    },
    { tab: 'habits', icon: 'flame', label: 'Beste streak', value: `${streak}d` },
    { tab: 'notes', icon: 'notes', label: 'Notities', value: String(notes.length) },
  ];

  return (
    <div className="dashboard-page">
      <DashboardAtmosphere />
      <LiquidGlassFilter />

      <div className="dashboard-content">
        <div className="page-header">
          <span className="page-eyebrow">Overzicht</span>
          <h1>Dashboard</h1>
        </div>

        <div className="stat-grid">
          {stats.map((stat) => (
            <button
              type="button"
              className="stat-card widget-card"
              key={stat.label}
              onClick={() => onNavigate?.(stat.tab)}
            >
              <span className="stat-icon">{ICONS[stat.icon]}</span>
              <span className="stat-label">{stat.label}</span>
              <span className={`stat-value${stat.negative ? ' negative' : ''}`}>{stat.value}</span>
            </button>
          ))}
        </div>

        <div className="dashboard-panels">
          <CalendarCard />
          <WeatherCard />
          <NewsCard />

          <section className="widget-card panel">
            <div className="widget-head">
              <h2>Volgende taken</h2>
              <button type="button" className="widget-link" onClick={() => onNavigate?.('scrum')}>
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

          <section className="widget-card panel">
            <div className="widget-head">
              <h2>Binnenkort te betalen</h2>
              <button type="button" className="widget-link" onClick={() => onNavigate?.('budget')}>
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
    </div>
  );
}

export default DashboardPage;
