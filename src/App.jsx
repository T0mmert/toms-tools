import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import CommandPalette from './components/CommandPalette';
import DashboardAtmosphere from './components/DashboardAtmosphere';
import LiquidGlassFilter from './components/LiquidGlassFilter';
import PageIcon from './components/PageIcon';
import Sidebar from './components/Sidebar';
import SyncPanel from './components/SyncPanel';
import TabBar from './components/TabBar';
import { useStore } from './hooks/useStore';
import { createId } from './lib/id';
import { sendIntent } from './lib/intents';
import { PAGES, QUICK_ACTIONS, getPage } from './lib/pages';
import { KEYS } from './lib/schema';
import { addTab, closeTab, openPage, selectTab } from './lib/tabs';
import DashboardPage from './pages/DashboardPage';
import GoalsPage from './pages/GoalsPage';
import HabitsPage from './pages/HabitsPage';
import NotesPage from './pages/NotesPage';
import StartPage from './pages/StartPage';
import './App.css';

// Budget and the Scrum board pull in the charting library; keeping them out of
// the initial bundle roughly halves what the dashboard has to download.
const BudgetPage = lazy(() => import('./pages/BudgetPage'));
const ScrumBoard = lazy(() => import('./pages/ScrumBoard'));

const PAGE_COMPONENTS = {
  dashboard: DashboardPage,
  scrum: ScrumBoard,
  budget: BudgetPage,
  goals: GoalsPage,
  habits: HabitsPage,
  notes: NotesPage,
};

// A registry page without a component yet (and its quick action) stays hidden
// rather than opening a blank tab.
const AVAILABLE_PAGES = PAGES.filter((page) => PAGE_COMPONENTS[page.id]);
const AVAILABLE_ACTIONS = QUICK_ACTIONS.filter((action) => PAGE_COMPONENTS[action.page]);
const NAV = AVAILABLE_PAGES.map((page) => ({ id: page.id, label: page.label, icon: <PageIcon d={page.icon} /> }));

function App() {
  const [tabs, setTabs] = useStore(KEYS.tabs);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);

  const activeTab = tabs.open.find((tab) => tab.id === tabs.active) || tabs.open[0];
  const activePage = activeTab.page;
  const Page = activePage ? PAGE_COMPONENTS[activePage] : null;
  // The photo and glass belong to the glass pages; the others keep their
  // plain surfaces.
  const glass = activePage === null || !!getPage(activePage)?.glass;

  /** Open a page in the tab strip, optionally handing it a quick action. */
  const navigate = useCallback(
    (page, intent) => {
      if (!PAGE_COMPONENTS[page]) return;
      if (intent) sendIntent(page, intent);
      const id = createId();
      setTabs((prev) => openPage(prev, page, id));
    },
    [setTabs],
  );

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

      <LiquidGlassFilter />
      {glass && <DashboardAtmosphere />}

      <Sidebar
        tabs={NAV}
        activeTab={activePage}
        onSelect={navigate}
        onOpenSearch={() => setPaletteOpen(true)}
        onOpenSync={() => setSyncOpen(true)}
      />

      <main className="app-main" id="main-content" tabIndex={-1}>
        <TabBar
          tabs={tabs}
          onSelect={(id) => setTabs((prev) => selectTab(prev, id))}
          onClose={(id) => setTabs((prev) => closeTab(prev, id))}
          onAdd={() => {
            const id = createId();
            setTabs((prev) => addTab(prev, id));
          }}
        />

        <div role="tabpanel" id="tab-panel" aria-labelledby={`tab-${activeTab.id}`}>
          <Suspense fallback={<p className="page-loading">Laden…</p>}>
            {activePage === null ? (
              <StartPage key={activeTab.id} pages={AVAILABLE_PAGES} actions={AVAILABLE_ACTIONS} onOpen={navigate} />
            ) : (
              Page && <Page key={activeTab.id} onNavigate={navigate} />
            )}
          </Suspense>
        </div>
      </main>

      {paletteOpen && (
        <CommandPalette
          pages={AVAILABLE_PAGES}
          actions={AVAILABLE_ACTIONS}
          onClose={() => setPaletteOpen(false)}
          onNavigate={navigate}
        />
      )}
      {syncOpen && <SyncPanel onClose={() => setSyncOpen(false)} />}
    </div>
  );
}

export default App;
