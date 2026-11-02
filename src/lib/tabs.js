import { HOME_PAGE, PAGE_IDS } from './pages';

/**
 * Open tabs as plain data: `{ open: [{ id, page }], active }`, where
 * `page: null` is an empty tab showing the start page.
 *
 * Every function here is pure and returns the same state object when nothing
 * changes, so React can skip the re-render. The rules mirror the approved
 * prototype: the Dashboard tab is pinned first and cannot close, a page is
 * never open in two tabs, and there is at most one empty tab.
 */
export const MAX_TABS = 12;

const HOME_TAB_ID = 'home';

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

export function defaultTabs() {
  return { open: [{ id: HOME_TAB_ID, page: HOME_PAGE }], active: HOME_TAB_ID };
}

export function isPinned(tab) {
  return tab.page === HOME_PAGE;
}

export function normalizeTabs(value, knownPages = PAGE_IDS) {
  if (!isObject(value) || !Array.isArray(value.open)) return defaultTabs();

  const ids = new Set();
  const pages = new Set();
  let home = null;
  let hasStart = false;
  const rest = [];

  value.open.forEach((tab) => {
    if (!isObject(tab) || typeof tab.id !== 'string' || !tab.id || ids.has(tab.id)) return;
    if (tab.page === null) {
      if (hasStart) return;
      hasStart = true;
    } else if (!knownPages.includes(tab.page) || pages.has(tab.page)) {
      return;
    }
    ids.add(tab.id);
    if (tab.page !== null) pages.add(tab.page);
    if (tab.page === HOME_PAGE) home = { id: tab.id, page: HOME_PAGE };
    else rest.push({ id: tab.id, page: tab.page });
  });

  if (!home) {
    let id = HOME_TAB_ID;
    while (ids.has(id)) id += '_';
    home = { id, page: HOME_PAGE };
  }

  const open = [home, ...rest].slice(0, MAX_TABS);
  const active = open.some((tab) => tab.id === value.active) ? value.active : open[0].id;
  return { open, active };
}

export function selectTab(state, tabId) {
  if (state.active === tabId || !state.open.some((tab) => tab.id === tabId)) return state;
  return { ...state, active: tabId };
}

/** The "+" button: reuse an existing empty tab rather than stacking them. */
export function addTab(state, newId) {
  const start = state.open.find((tab) => tab.page === null);
  if (start) return selectTab(state, start.id);
  if (state.open.length >= MAX_TABS) return state;
  return { open: [...state.open, { id: newId, page: null }], active: newId };
}

/** Closing the active tab hands focus to its left neighbour. */
export function closeTab(state, tabId) {
  const index = state.open.findIndex((tab) => tab.id === tabId);
  if (index === -1 || isPinned(state.open[index])) return state;
  const open = state.open.filter((tab) => tab.id !== tabId);
  const active = state.active === tabId ? open[Math.max(0, index - 1)].id : state.active;
  return { open, active };
}

/**
 * Navigate to a page from anywhere (start page, sidebar, palette, a tile).
 *
 * An already-open page is focused instead of duplicated; an empty tab turns
 * into the page; otherwise the page opens in a new tab. With the strip full,
 * the active tab navigates in place so a page is always reachable.
 */
export function openPage(state, page, newId) {
  if (!PAGE_IDS.includes(page)) return state;
  const current = state.open.find((tab) => tab.id === state.active);
  const existing = state.open.find((tab) => tab.page === page);

  if (existing) {
    if (current && current.page === null && current.id !== existing.id) {
      return { open: state.open.filter((tab) => tab.id !== current.id), active: existing.id };
    }
    return selectTab(state, existing.id);
  }

  if (current && current.page === null) {
    return { ...state, open: state.open.map((tab) => (tab.id === current.id ? { ...tab, page } : tab)) };
  }

  if (state.open.length < MAX_TABS) {
    return { open: [...state.open, { id: newId, page }], active: newId };
  }

  const target = current && !isPinned(current) ? current : state.open[state.open.length - 1];
  return {
    open: state.open.map((tab) => (tab.id === target.id ? { ...tab, page } : tab)),
    active: target.id,
  };
}

/** Drag reordering; the pinned Dashboard tab stays first. */
export function reorder(state, from, to) {
  const last = state.open.length - 1;
  if (from === to || from < 1 || to < 1 || from > last || to > last) return state;
  const open = [...state.open];
  const [moved] = open.splice(from, 1);
  open.splice(to, 0, moved);
  return { ...state, open };
}

/** The tab `delta` steps from the active one, wrapping at both ends. */
export function neighbourTab(state, delta) {
  const index = state.open.findIndex((tab) => tab.id === state.active);
  const count = state.open.length;
  return state.open[(((index + delta) % count) + count) % count].id;
}
