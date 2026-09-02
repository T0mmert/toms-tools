export const COLUMN_ORDER = ['backlog', 'todo', 'inprogress', 'done'];

export const COLUMN_TITLES = {
  backlog: 'Backlog',
  todo: 'To Do',
  inprogress: 'In Progress',
  done: 'Done',
};

export const COLUMN_ACCENTS = {
  backlog: '#8f8a79',
  todo: '#f2c94c',
  inprogress: '#0d9488',
  done: '#1a7a4c',
};

export function emptyBoard() {
  return {
    cards: {},
    columnOrder: [...COLUMN_ORDER],
    columns: Object.fromEntries(
      COLUMN_ORDER.map((id) => [id, { id, title: COLUMN_TITLES[id], cardIds: [] }]),
    ),
  };
}

export function columnHours(board, columnId) {
  return (board.columns[columnId]?.cardIds || []).reduce(
    (sum, cardId) => sum + (board.cards[cardId]?.hours || 0),
    0,
  );
}

/** Estimated hours still outstanding — everything that is not Done. */
export function remainingHours(board) {
  return board.columnOrder
    .filter((id) => id !== 'done')
    .reduce((sum, id) => sum + columnHours(board, id), 0);
}

export function totalTrackedSeconds(board) {
  return Object.values(board.cards).reduce((sum, card) => sum + (card.trackedSeconds || 0), 0);
}

/** The next few cards to pick up, To Do first then Backlog. */
export function upNextCards(board, limit = 4) {
  const next = [];
  ['todo', 'backlog'].forEach((columnId) => {
    (board.columns[columnId]?.cardIds || []).forEach((cardId) => {
      const card = board.cards[cardId];
      if (card && next.length < limit) next.push({ ...card, columnId });
    });
  });
  return next;
}
