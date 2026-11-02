import { useEffect, useRef } from 'react';
import { START_ICON, getPage } from '../lib/pages';
import { isPinned, neighbourTab } from '../lib/tabs';
import PageIcon from './PageIcon';
import './TabBar.css';

const CLOSE_ICON = 'M6 6l8 8M14 6l-8 8';

/**
 * The tab strip. Arrow keys move between tabs (roving tabindex), the x on the
 * active tab or a middle click closes one, and "+" opens the start page.
 */
function TabBar({ tabs, onSelect, onClose, onAdd }) {
  const stripRef = useRef(null);

  // Keep the active tab in view when it changes from elsewhere (palette,
  // sidebar, a tile) on a strip that scrolls.
  useEffect(() => {
    const el = stripRef.current?.querySelector('[aria-selected="true"]');
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [tabs.active]);

  function focusTab(id) {
    requestAnimationFrame(() => document.getElementById(`tab-${id}`)?.focus());
  }

  function onKeyDown(e) {
    let id = null;
    if (e.key === 'ArrowRight') id = neighbourTab(tabs, 1);
    else if (e.key === 'ArrowLeft') id = neighbourTab(tabs, -1);
    else if (e.key === 'Home') id = tabs.open[0].id;
    else if (e.key === 'End') id = tabs.open[tabs.open.length - 1].id;
    if (!id) return;
    e.preventDefault();
    onSelect(id);
    focusTab(id);
  }

  return (
    <div className="tabbar">
      <div className="tabbar-strip" role="tablist" aria-label="Geopende pagina's" ref={stripRef} onKeyDown={onKeyDown}>
        {tabs.open.map((tab) => {
          const page = tab.page ? getPage(tab.page) : null;
          const label = page ? page.label : 'Nieuw tabblad';
          const active = tab.id === tabs.active;
          const closable = !isPinned(tab);
          return (
            <div key={tab.id} className={`tab${active ? ' tab-active' : ''}`} role="presentation">
              <button
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                className="tab-button"
                aria-selected={active}
                aria-controls="tab-panel"
                tabIndex={active ? 0 : -1}
                title={label}
                onClick={() => onSelect(tab.id)}
                onMouseDown={(e) => {
                  // Stop the browser's middle-click autoscroll so the close lands.
                  if (e.button === 1) e.preventDefault();
                }}
                onAuxClick={(e) => {
                  if (e.button === 1 && closable) onClose(tab.id);
                }}
              >
                <PageIcon d={page ? page.icon : START_ICON} />
                <span className="tab-label">{label}</span>
              </button>
              {active && closable && (
                <button type="button" className="tab-close" aria-label={`${label} sluiten`} onClick={() => onClose(tab.id)}>
                  <PageIcon d={CLOSE_ICON} strokeWidth={1.8} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <button type="button" className="tab-add" aria-label="Nieuw tabblad openen" onClick={onAdd}>
        <PageIcon d="M10 4v12M4 10h12" strokeWidth={1.8} />
      </button>
    </div>
  );
}

export default TabBar;
