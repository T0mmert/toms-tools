/**
 * The page registry: one entry per page, read by the tab bar, the start page,
 * the sidebar and the command palette, so adding a page is a single edit.
 *
 * Kept free of React so the tab logic that depends on it stays testable in
 * plain Node; App.jsx maps ids to the page components themselves. Icons are
 * stroke paths on a 20x20 grid, rendered by PageIcon.
 */
export const HOME_PAGE = 'dashboard';

export const PAGES = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    pinned: true,
    glass: true,
    icon: 'M3 3h5.5v5.5H3zM11.5 3H17v3.5h-5.5zM11.5 9H17v5.5h-5.5zM3 11.5h5.5V16H3z',
  },
  {
    id: 'hours',
    label: 'Uren',
    glass: true,
    icon: 'M10 3a7 7 0 1 0 0 14a7 7 0 0 0 0-14ZM10 6.2V10l2.8 1.8',
  },
  {
    id: 'scrum',
    label: 'Scrum Board',
    icon: 'M4 3.5h2.5a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1ZM10 3.5h2.5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z',
  },
  {
    id: 'budget',
    label: 'Budget',
    icon: 'M4.5 5h11A2 2 0 0 1 17.5 7v7a2 2 0 0 1-2 2h-11A2 2 0 0 1 2.5 14V7a2 2 0 0 1 2-2ZM2.5 8.5h15',
  },
  {
    id: 'goals',
    label: 'Goals',
    icon: 'M10 3a7 7 0 1 0 0 14a7 7 0 0 0 0-14ZM10 6.4a3.6 3.6 0 1 0 0 7.2a3.6 3.6 0 0 0 0-7.2Z',
  },
  {
    id: 'habits',
    label: 'Habits',
    icon: 'M10 2.5c1.2 2 3.2 4.1 3.2 7a3.2 3.2 0 0 1-6.4 0c0-.9.3-1.6.7-2.2.1 1 .8 1.7 1.5 1.5.6-.2.7-1 .3-1.7C8.4 5.8 9.4 4 10 2.5ZM6.8 12.2c-.3.6-.5 1.3-.5 2a3.7 3.7 0 0 0 7.4 0c0-.9-.3-1.7-.7-2.3',
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: 'M5.5 2.5h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2ZM6.5 7h7M6.5 10.5h7M6.5 14h4',
  },
];

/** Icon for an empty tab that shows the start page. */
export const START_ICON =
  'M4 3h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM12 3h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM4 11h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1ZM12 11h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1Z';

export const PAGE_IDS = PAGES.map((page) => page.id);

export function getPage(id) {
  return PAGES.find((page) => page.id === id) || null;
}
