import { addDays, fromLocalISO } from './format';

const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

/**
 * GET against the Calendar API.
 *
 * A 401 gets its own `.code` so the caller can tell "the token is dead,
 * reconnect" apart from a generic API hiccup — retrying a fetch with a token
 * that's already known to be dead would just fail again the same way.
 */
async function getJson(url, accessToken) {
  let response;
  try {
    response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  } catch {
    throw new Error('Geen verbinding met Google Agenda.');
  }

  if (response.status === 401) {
    const err = new Error('Je sessie is verlopen.');
    err.code = 'auth';
    throw err;
  }
  if (!response.ok) {
    throw new Error('Google Agenda gaf een fout terug.');
  }
  return response.json();
}

/** Read-only upcoming events from the user's primary Google Calendar. */
export async function fetchUpcomingEvents(accessToken, { maxResults = 6, daysAhead = 14 } = {}) {
  const params = new URLSearchParams({
    timeMin: new Date().toISOString(),
    timeMax: addDays(new Date(), daysAhead).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(maxResults),
  });

  const data = await getJson(`${EVENTS_URL}?${params}`, accessToken);
  const items = Array.isArray(data.items) ? data.items : [];

  return items.map((item) => {
    const allDay = !item.start?.dateTime;
    // A bare YYYY-MM-DD (all-day events) parses as UTC midnight in JS, which
    // can shift the displayed day for anyone west of UTC — fromLocalISO
    // exists for exactly this reason, see format.js.
    const start = allDay ? fromLocalISO(item.start.date) : new Date(item.start.dateTime);
    return {
      id: item.id,
      title: item.summary || 'Naamloos evenement',
      start,
      allDay,
      location: item.location || '',
    };
  });
}

// Ten pages of 250 is far beyond three months of shifts; the cap only stops a
// misbehaving response from looping forever.
const MAX_PAGES = 10;

/**
 * Every timed event between two instants, following pagination. Cancelled and
 * all-day events are skipped: a shift always has a start and an end time.
 */
export async function fetchEventsInRange(accessToken, from, to, { q } = {}) {
  const events = [];
  let pageToken = '';
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params = new URLSearchParams({
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    });
    if (q) params.set('q', q);
    if (pageToken) params.set('pageToken', pageToken);

    const data = await getJson(`${EVENTS_URL}?${params}`, accessToken);
    (Array.isArray(data.items) ? data.items : []).forEach((item) => {
      if (item.status === 'cancelled' || !item.start?.dateTime || !item.end?.dateTime) return;
      events.push({
        id: item.id,
        title: item.summary || '',
        start: new Date(item.start.dateTime).toISOString(),
        end: new Date(item.end.dateTime).toISOString(),
      });
    });

    pageToken = typeof data.nextPageToken === 'string' ? data.nextPageToken : '';
    if (!pageToken) break;
  }
  return events;
}

export const SHIFT_DAYS_BACK = 60;
export const SHIFT_DAYS_AHEAD = 30;

/**
 * Shift events for the import window (60 days back, 30 ahead), matched by a
 * case-insensitive "contains" on the title. Returns the window too, so the
 * merge knows where a missing event really means "removed".
 */
export async function fetchShiftEvents(accessToken, shiftTitle, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = addDays(today, -SHIFT_DAYS_BACK);
  const to = addDays(today, SHIFT_DAYS_AHEAD + 1);
  const needle = shiftTitle.trim().toLowerCase();
  const events = await fetchEventsInRange(accessToken, from, to, { q: shiftTitle.trim() });
  return { from, to, shifts: events.filter((event) => event.title.toLowerCase().includes(needle)) };
}
