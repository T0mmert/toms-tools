import { COLUMN_ORDER, COLUMN_TITLES, emptyBoard } from './board';

export const STORAGE_PREFIX = 'toms-tools:';

export const KEYS = {
  budget: 'toms-tools:budget',
  recurring: 'toms-tools:recurring',
  board: 'toms-tools:scrum-board',
  history: 'toms-tools:scrum-history',
  timer: 'toms-tools:timer',
  sessions: 'toms-tools:sessions',
  notes: 'toms-tools:notes',
  goals: 'toms-tools:goals',
  habits: 'toms-tools:habits',
  theme: 'toms-tools:theme',
  sync: 'toms-tools:sync',
  location: 'toms-tools:location',
  calendar: 'toms-tools:calendar',
};

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v, fallback = '') => (typeof v === 'string' ? v : fallback);
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const isoDate = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

/**
 * Every store normalizes rather than rejects: anything recognisable is kept and
 * repaired, anything malformed is dropped. A hand-edited or truncated backup
 * therefore degrades gracefully instead of crashing a page mid-render.
 */
export const STORES = {
  [KEYS.budget]: {
    kind: 'array',
    defaultValue: () => [],
    normalize(value) {
      if (!Array.isArray(value)) return [];
      return value.reduce((out, entry) => {
        if (!isObject(entry)) return out;
        const amount = num(entry.amount);
        const type = entry.type === 'income' ? 'income' : 'expense';
        if (amount === null || amount < 0 || !str(entry.id)) return out;
        out.push({
          id: entry.id,
          type,
          amount,
          description: str(entry.description, 'Naamloos'),
          category: str(entry.category, 'Overig'),
          date: isoDate(entry.date) || '',
        });
        return out;
      }, []);
    },
  },

  [KEYS.recurring]: {
    kind: 'array',
    defaultValue: () => [],
    normalize(value) {
      if (!Array.isArray(value)) return [];
      return value.reduce((out, item) => {
        if (!isObject(item)) return out;
        const amount = num(item.amount);
        const day = num(item.day);
        if (!str(item.id) || amount === null || amount < 0) return out;
        if (day === null || day < 1 || day > 31) return out;
        out.push({ id: item.id, name: str(item.name, 'Naamloos'), amount, day: Math.round(day) });
        return out;
      }, []);
    },
  },

  [KEYS.board]: {
    kind: 'object',
    defaultValue: emptyBoard,
    normalize(value) {
      const base = emptyBoard();
      if (!isObject(value)) return base;

      const cards = {};
      if (isObject(value.cards)) {
        Object.entries(value.cards).forEach(([id, card]) => {
          if (!isObject(card)) return;
          const hours = num(card.hours);
          const tracked = num(card.trackedSeconds);
          // A card with no title is debris (e.g. from a timer that outlived its
          // card) — it can never be rendered, so it is not worth keeping.
          if (!str(card.title).trim()) return;
          cards[id] = {
            id,
            title: card.title,
            hours: hours === null || hours < 0 ? 0 : hours,
            trackedSeconds: tracked === null || tracked < 0 ? 0 : tracked,
          };
        });
      }

      const seen = new Set();
      COLUMN_ORDER.forEach((columnId) => {
        const source = isObject(value.columns) ? value.columns[columnId] : null;
        const ids = Array.isArray(source?.cardIds) ? source.cardIds : [];
        // Keep only ids that resolve to a real card, and only once each.
        const cardIds = ids.filter((id) => {
          if (typeof id !== 'string' || !cards[id] || seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        base.columns[columnId] = { id: columnId, title: COLUMN_TITLES[columnId], cardIds };
      });

      // Unreachable cards (in `cards` but in no column) are dropped with them.
      base.cards = Object.fromEntries(Object.entries(cards).filter(([id]) => seen.has(id)));
      return base;
    },
  },

  [KEYS.history]: {
    kind: 'array',
    defaultValue: () => [],
    normalize(value) {
      if (!Array.isArray(value)) return [];
      const byDate = new Map();
      value.forEach((point) => {
        if (!isObject(point)) return;
        const date = isoDate(point.date);
        const hours = num(point.hours);
        if (!date || hours === null || hours < 0) return;
        byDate.set(date, { date, hours });
      });
      return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
    },
  },

  [KEYS.timer]: {
    kind: 'object',
    defaultValue: () => ({ cardId: null, startedAt: null }),
    normalize(value) {
      if (!isObject(value)) return { cardId: null, startedAt: null };
      const cardId = str(value.cardId) || null;
      const startedAt = num(value.startedAt);
      // A start time in the future is unusable; treat the timer as idle.
      if (!cardId || startedAt === null || startedAt > Date.now() + 60000) {
        return { cardId: null, startedAt: null };
      }
      return { cardId, startedAt };
    },
  },

  // One row per completed timer run. The per-card `trackedSeconds` total stays
  // authoritative for "time on this task"; sessions add the *when*, which is
  // what any report over time needs.
  [KEYS.sessions]: {
    kind: 'array',
    defaultValue: () => [],
    normalize(value) {
      if (!Array.isArray(value)) return [];
      return value.reduce((out, session) => {
        if (!isObject(session)) return out;
        const seconds = num(session.seconds);
        const date = isoDate(session.date);
        if (!date || seconds === null || seconds <= 0) return out;
        out.push({
          id: str(session.id) || `${date}-${out.length}`,
          cardId: str(session.cardId),
          title: str(session.title, 'Naamloze taak'),
          date,
          seconds,
        });
        return out;
      }, []);
    },
  },

  [KEYS.notes]: {
    kind: 'array',
    defaultValue: () => [],
    normalize(value) {
      if (!Array.isArray(value)) return [];
      const colors = ['amber', 'teal', 'rose', 'sage'];
      return value.reduce((out, note, i) => {
        if (!isObject(note) || !str(note.id)) return out;
        out.push({
          id: note.id,
          text: str(note.text),
          color: colors.includes(note.color) ? note.color : colors[i % colors.length],
          updatedAt: num(note.updatedAt) ?? Date.now(),
        });
        return out;
      }, []);
    },
  },

  [KEYS.goals]: {
    kind: 'array',
    defaultValue: () => [],
    normalize(value) {
      if (!Array.isArray(value)) return [];
      return value.reduce((out, goal) => {
        if (!isObject(goal) || !str(goal.id)) return out;
        const target = num(goal.target);
        const current = num(goal.current);
        if (target === null || target <= 0) return out;
        out.push({
          id: goal.id,
          title: str(goal.title, 'Naamloos doel'),
          unit: str(goal.unit),
          target,
          current: current === null ? 0 : current,
        });
        return out;
      }, []);
    },
  },

  [KEYS.habits]: {
    kind: 'array',
    defaultValue: () => [],
    normalize(value) {
      if (!Array.isArray(value)) return [];
      return value.reduce((out, habit) => {
        if (!isObject(habit) || !str(habit.id)) return out;
        const doneDates = Array.isArray(habit.doneDates)
          ? [...new Set(habit.doneDates.map(isoDate).filter(Boolean))]
          : [];
        out.push({ id: habit.id, title: str(habit.title, 'Naamloze gewoonte'), doneDates });
        return out;
      }, []);
    },
  },

  [KEYS.theme]: {
    kind: 'string',
    defaultValue: () => 'system',
    normalize(value) {
      return value === 'light' || value === 'dark' ? value : 'system';
    },
  },

  // The city the weather widget shows. Empty by default — nothing is
  // requested until the user picks a place.
  [KEYS.location]: {
    kind: 'object',
    defaultValue: () => null,
    normalize(value) {
      if (!isObject(value)) return null;
      const lat = num(value.lat);
      const lon = num(value.lon);
      const name = str(value.name);
      if (lat === null || lon === null || !name) return null;
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
      return { name, lat, lon };
    },
  },

  // Sync settings are deliberately empty by default: nothing leaves this
  // browser until an endpoint is entered by hand.
  [KEYS.sync]: {
    kind: 'object',
    defaultValue: () => ({ endpoint: '', token: '', auto: false, lastSyncedAt: null }),
    normalize(value) {
      if (!isObject(value)) return { endpoint: '', token: '', auto: false, lastSyncedAt: null };
      return {
        endpoint: str(value.endpoint),
        token: str(value.token),
        auto: value.auto === true,
        lastSyncedAt: num(value.lastSyncedAt),
      };
    },
  },

  // Only the OAuth Client ID is persisted — it isn't secret (Google's own
  // docs ship it in client-side code) and unlike the sync token it grants
  // nothing by itself. The access token it's used to obtain lives only in
  // CalendarCard's own state for the life of the tab.
  [KEYS.calendar]: {
    kind: 'object',
    defaultValue: () => ({ clientId: '' }),
    normalize(value) {
      if (!isObject(value)) return { clientId: '' };
      return { clientId: str(value.clientId) };
    },
  },
};

export function getStore(key) {
  return STORES[key] || null;
}

/**
 * Whether a value is even the right shape for a store.
 *
 * Import uses this before normalizing: a value of the wrong kind (a string
 * where a list belongs, say) means the backup is damaged for that key, and
 * skipping it leaves the existing data alone rather than replacing it with an
 * empty default.
 */
export function matchesKind(key, value) {
  const store = STORES[key];
  if (!store) return false;
  if (store.kind === 'array') return Array.isArray(value);
  if (store.kind === 'object') return isObject(value);
  if (store.kind === 'string') return typeof value === 'string';
  return false;
}
