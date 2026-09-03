import { addDays, fromLocalISO } from './format';

const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

/**
 * Read-only upcoming events from the user's primary Google Calendar.
 *
 * A 401 gets its own `.code` so the caller can tell "the token is dead,
 * reconnect" apart from a generic API hiccup — retrying a fetch with a token
 * that's already known to be dead would just fail again the same way.
 */
export async function fetchUpcomingEvents(accessToken, { maxResults = 6, daysAhead = 14 } = {}) {
  const params = new URLSearchParams({
    timeMin: new Date().toISOString(),
    timeMax: addDays(new Date(), daysAhead).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(maxResults),
  });

  let response;
  try {
    response = await fetch(`${EVENTS_URL}?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
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

  const data = await response.json();
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
