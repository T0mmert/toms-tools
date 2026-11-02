import { describe, expect, it } from 'vitest';
import {
  MAX_TABS,
  addTab,
  closeTab,
  defaultTabs,
  neighbourTab,
  normalizeTabs,
  openPage,
  reorder,
  selectTab,
} from './tabs.js';

const home = { id: 'home', page: 'dashboard' };

function state(open, active) {
  return { open, active: active ?? open[0].id };
}

describe('normalizeTabs', () => {
  it('falls back to a lone Dashboard tab for junk', () => {
    expect(normalizeTabs(null)).toEqual(defaultTabs());
    expect(normalizeTabs({ open: 'x' })).toEqual(defaultTabs());
  });

  it('drops unknown pages and malformed entries', () => {
    const result = normalizeTabs({
      open: [home, { id: 'a', page: 'nope' }, { id: '', page: 'notes' }, 'x', { id: 'b', page: 'notes' }],
      active: 'b',
    });
    expect(result).toEqual(state([home, { id: 'b', page: 'notes' }], 'b'));
  });

  it('forces the Dashboard tab to exist and come first', () => {
    expect(normalizeTabs({ open: [{ id: 'b', page: 'notes' }], active: 'b' }).open[0].page).toBe('dashboard');
    const moved = normalizeTabs({ open: [{ id: 'b', page: 'notes' }, home], active: 'home' });
    expect(moved.open.map((t) => t.id)).toEqual(['home', 'b']);
  });

  it('repairs an active id that points nowhere', () => {
    expect(normalizeTabs({ open: [home, { id: 'b', page: 'notes' }], active: 'gone' }).active).toBe('home');
  });

  it('caps the strip at the maximum', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ id: `t${i}`, page: null }));
    const pages = ['hours', 'scrum', 'budget', 'goals', 'habits', 'notes'].map((page, i) => ({ id: `p${i}`, page }));
    expect(normalizeTabs({ open: [home, ...pages, ...many] }).open.length).toBeLessThanOrEqual(MAX_TABS);
  });

  it('dedupes tab ids, pages and empty tabs', () => {
    const result = normalizeTabs({
      open: [
        home,
        { id: 'a', page: 'notes' },
        { id: 'a', page: 'goals' },
        { id: 'b', page: 'notes' },
        { id: 'c', page: null },
        { id: 'd', page: null },
      ],
    });
    expect(result.open).toEqual([home, { id: 'a', page: 'notes' }, { id: 'c', page: null }]);
  });

  it('does not reuse an id already taken when adding the Dashboard tab', () => {
    const result = normalizeTabs({ open: [{ id: 'home', page: 'notes' }] });
    expect(result.open[0].page).toBe('dashboard');
    expect(new Set(result.open.map((t) => t.id)).size).toBe(2);
  });
});

describe('tab actions', () => {
  it('adds one empty tab and reuses it on the next press', () => {
    const once = addTab(defaultTabs(), 'n1');
    expect(once).toEqual(state([home, { id: 'n1', page: null }], 'n1'));
    const elsewhere = selectTab(once, 'home');
    expect(addTab(elsewhere, 'n2')).toEqual(once);
  });

  it('refuses a new tab when the strip is full', () => {
    const full = state([home, ...Array.from({ length: MAX_TABS - 1 }, (_, i) => ({ id: `t${i}`, page: 'notes' }))]);
    expect(addTab(full, 'n')).toBe(full);
  });

  it('never closes the Dashboard tab', () => {
    const s = defaultTabs();
    expect(closeTab(s, 'home')).toBe(s);
  });

  it('moves focus to the left neighbour after closing the active tab', () => {
    const s = state([home, { id: 'a', page: 'notes' }, { id: 'b', page: 'goals' }], 'b');
    expect(closeTab(s, 'b')).toEqual(state([home, { id: 'a', page: 'notes' }], 'a'));
  });

  it('keeps the active tab when closing another one', () => {
    const s = state([home, { id: 'a', page: 'notes' }, { id: 'b', page: 'goals' }], 'b');
    expect(closeTab(s, 'a').active).toBe('b');
  });

  it('turns the empty tab into the chosen page', () => {
    const s = state([home, { id: 'n', page: null }], 'n');
    expect(openPage(s, 'budget', 'x')).toEqual(state([home, { id: 'n', page: 'budget' }], 'n'));
  });

  it('focuses an already-open page and drops the empty tab instead of duplicating', () => {
    const s = state([home, { id: 'a', page: 'budget' }, { id: 'n', page: null }], 'n');
    expect(openPage(s, 'budget', 'x')).toEqual(state([home, { id: 'a', page: 'budget' }], 'a'));
  });

  it('opens a page in a new tab from a normal tab', () => {
    const s = state([home, { id: 'a', page: 'budget' }], 'a');
    expect(openPage(s, 'notes', 'x')).toEqual(state([home, { id: 'a', page: 'budget' }, { id: 'x', page: 'notes' }], 'x'));
  });

  it('navigates in place when the strip is full', () => {
    const pages = ['hours', 'scrum', 'budget', 'goals', 'habits'];
    const open = [home, ...pages.map((page, i) => ({ id: `p${i}`, page }))];
    while (open.length < MAX_TABS) open.push({ id: `x${open.length}`, page: 'hours' });
    const full = state(open, 'p1');
    const next = openPage(full, 'notes', 'new');
    expect(next.open.length).toBe(MAX_TABS);
    expect(next.open.find((t) => t.id === 'p1').page).toBe('notes');
  });

  it('ignores unknown pages', () => {
    const s = defaultTabs();
    expect(openPage(s, 'nope', 'x')).toBe(s);
  });

  it('reorders tabs but keeps the Dashboard first', () => {
    const s = state([home, { id: 'a', page: 'notes' }, { id: 'b', page: 'goals' }]);
    expect(reorder(s, 2, 1).open.map((t) => t.id)).toEqual(['home', 'b', 'a']);
    expect(reorder(s, 1, 0)).toBe(s);
    expect(reorder(s, 0, 2)).toBe(s);
  });

  it('finds neighbours with wrap-around', () => {
    const s = state([home, { id: 'a', page: 'notes' }, { id: 'b', page: 'goals' }], 'home');
    expect(neighbourTab(s, 1)).toBe('a');
    expect(neighbourTab(s, -1)).toBe('b');
  });
});
