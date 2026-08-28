import { useState } from 'react';
import BudgetPage from './pages/BudgetPage';
import ScrumBoard from './pages/ScrumBoard';
import './App.css';

const TABS = [
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
];

function App() {
  const [activeTab, setActiveTab] = useState('scrum');

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

        <div className="sidebar-footer">Data stays in this browser</div>
      </aside>

      <main className="app-main">
        {activeTab === 'budget' ? <BudgetPage /> : <ScrumBoard />}
      </main>
    </div>
  );
}

export default App;
