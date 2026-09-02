import { Suspense, lazy, useEffect, useState } from 'react';
import CommandPalette from './components/CommandPalette';
import Sidebar from './components/Sidebar';
import SyncPanel from './components/SyncPanel';
import DashboardPage from './pages/DashboardPage';
import GoalsPage from './pages/GoalsPage';
import HabitsPage from './pages/HabitsPage';
import NotesPage from './pages/NotesPage';
import './App.css';

// Budget and the Scrum board pull in the charting library; keeping them out of
// the initial bundle roughly halves what the dashboard has to download.
const BudgetPage = lazy(() => import('./pages/BudgetPage'));
const ScrumBoard = lazy(() => import('./pages/ScrumBoard'));

const TABS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.3" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="2.5" width="6.5" height="4" rx="1.3" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="8.5" width="6.5" height="6.5" rx="1.3" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2.5" y="11" width="6.5" height="4" rx="1.3" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: 'scrum',
    label: 'Scrum Board',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2.5" y="3.5" width="4.5" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="8.5" y="3.5" width="4.5" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="14.5" y="3.5" width="3" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: 'budget',
    label: 'Budget',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2.5" y="5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2.5 8.5H17.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="14" cy="12.5" r="1.4" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'goals',
    label: 'Goals',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="10" cy="10" r="3.6" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="10" cy="10" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'habits',
    label: 'Habits',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M10 2.5c1.2 2 3.2 4.1 3.2 7a3.2 3.2 0 0 1-6.4 0c0-.9.3-1.6.7-2.2.1 1 .8 1.7 1.5 1.5.6-.2.7-1 .3-1.7C8.4 5.8 9.4 4 10 2.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M6.8 12.2c-.3.6-.5 1.3-.5 2a3.7 3.7 0 0 0 7.4 0c0-.9-.3-1.7-.7-2.3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3.5" y="2.5" width="13" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6.5 7H13.5M6.5 10.5H13.5M6.5 14H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Naar hoofdinhoud
      </a>

      <Sidebar
        tabs={TABS}
        activeTab={activeTab}
        onSelect={setActiveTab}
        onOpenSearch={() => setPaletteOpen(true)}
        onOpenSync={() => setSyncOpen(true)}
      />

      <main className="app-main" id="main-content" tabIndex={-1}>
        <Suspense fallback={<p className="page-loading">Laden…</p>}>
          {activeTab === 'dashboard' && <DashboardPage onNavigate={setActiveTab} />}
          {activeTab === 'scrum' && <ScrumBoard />}
          {activeTab === 'budget' && <BudgetPage />}
          {activeTab === 'goals' && <GoalsPage />}
          {activeTab === 'habits' && <HabitsPage />}
          {activeTab === 'notes' && <NotesPage />}
        </Suspense>
      </main>

      {paletteOpen && (
        <CommandPalette onClose={() => setPaletteOpen(false)} onNavigate={setActiveTab} />
      )}
      {syncOpen && <SyncPanel onClose={() => setSyncOpen(false)} />}
    </div>
  );
}

export default App;
