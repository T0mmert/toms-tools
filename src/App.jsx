import { useState } from 'react';
import BudgetPage from './pages/BudgetPage';
import ScrumBoard from './pages/ScrumBoard';
import './App.css';

const TABS = [
  { id: 'scrum', label: 'Scrum Board' },
  { id: 'budget', label: 'Budget' },
];

function App() {
  const [activeTab, setActiveTab] = useState('scrum');

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Toms Tools</h1>
        <nav className="tab-nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="app-main">
        {activeTab === 'budget' ? <BudgetPage /> : <ScrumBoard />}
      </main>
    </div>
  );
}

export default App;
