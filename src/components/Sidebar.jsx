import { useEffect, useState } from 'react';
import DataControls from './DataControls';
import ThemeToggle from './ThemeToggle';

function Sidebar({ tabs, activeTab, onSelect, onOpenSearch, onOpenSync }) {
  const [navOpen, setNavOpen] = useState(false);

  // Close the mobile drawer once the viewport is wide enough to show the rail,
  // so resizing never leaves the page in a half-open state.
  useEffect(() => {
    const media = window.matchMedia('(min-width: 900px)');
    const sync = (e) => e.matches && setNavOpen(false);
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  function handleSelect(id) {
    onSelect(id);
    setNavOpen(false);
  }

  return (
    <aside className={`sidebar${navOpen ? ' nav-open' : ''}`}>
      <div className="sidebar-head">
        <div className="brand">
          <span className="brand-mark">
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="3" y="10" width="3.4" height="7" rx="1" fill="#f2c94c" />
              <rect x="8.3" y="5.5" width="3.4" height="11.5" rx="1" fill="#0d9488" />
              <rect x="13.6" y="8" width="3.4" height="9" rx="1" fill="#f6f3ec" />
            </svg>
          </span>
          <span className="brand-name">
            Toms <em>Tools</em>
          </span>
        </div>

        <button
          type="button"
          className="nav-toggle"
          onClick={() => setNavOpen((open) => !open)}
          aria-expanded={navOpen}
          aria-controls="main-nav"
          aria-label={navOpen ? 'Menu sluiten' : 'Menu openen'}
        >
          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            {navOpen ? (
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            ) : (
              <path d="M3.5 6H16.5M3.5 10H16.5M3.5 14H16.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      <div className="sidebar-scroll" id="main-nav">
        <button
          type="button"
          className="search-trigger"
          onClick={() => {
            onOpenSearch?.();
            setNavOpen(false);
          }}
        >
          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M13.2 13.2L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Zoeken
          <kbd>Ctrl K</kbd>
        </button>

        <nav className="tab-nav" aria-label="Hoofdnavigatie">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => handleSelect(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <span className="tab-icon" aria-hidden="true">
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <ThemeToggle />
          <DataControls onOpenSync={onOpenSync} />
          <p className="sidebar-footer">Data stays in this browser</p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
