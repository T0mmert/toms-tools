import { useState } from 'react';
import DataControls from './components/DataControls';
import ThemeToggle from './components/ThemeToggle';
import BudgetPage from './pages/BudgetPage';
import DashboardPage from './pages/DashboardPage';
import GoalsPage from './pages/GoalsPage';
import HabitsPage from './pages/HabitsPage';
import NotesPage from './pages/NotesPage';
import ScrumBoard from './pages/ScrumBoard';
import './App.css';

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
        <path d="M6.8 12.2c-.3.6-.5 1.3-.5 2a3.7 3.7 0 0 0 7.4 0c0-.9-.3-1.7-.7-2.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="10" width="3.4" height="7" rx="1" fill="#f2c94c" />
              <rect x="8.3" y="5.5" width="3.4" height="11.5" rx="1" fill="#0d9488" />
              <rect x="13.6" y="8" width="3.4" height="9" rx="1" fill="#f6f3ec" />
            </svg>
          </span>
          <span className="brand-name">
            Toms <em>Tools</em>
          </span>
        </div>

        <nav className="tab-nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <ThemeToggle />
          <DataControls />
          <div className="sidebar-footer">Data stays in this browser</div>
        </div>
      </aside>

      <main className="app-main">
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'budget' && <BudgetPage />}
        {activeTab === 'notes' && <NotesPage />}
        {activeTab === 'goals' && <GoalsPage />}
        {activeTab === 'habits' && <HabitsPage />}
        {activeTab === 'scrum' && <ScrumBoard />}
      </main>
    </div>
  );
}

export default App;
