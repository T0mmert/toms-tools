import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchEventsInRange, fetchShiftEvents } from './calendar.js';

function respond(body, status = 200) {
  return Promise.resolve({ status, ok: status >= 200 && status < 300, json: () => Promise.resolve(body) });
}

const timed = (id, summary, start, end, extra = {}) => ({
  id,
  summary,
  start: { dateTime: start },
  end: { dateTime: end },
  ...extra,
});

afterEach(() => vi.unstubAllGlobals());

describe('fetchEventsInRange', () => {
  const from = new Date('2026-10-01T00:00:00Z');
  const to = new Date('2026-11-01T00:00:00Z');

  it('follows pagination and skips cancelled and all-day events', async () => {
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(
        respond({
          items: [
            timed('a', 'HB Werk', '2026-10-29T18:00:00+01:00', '2026-10-30T00:30:00+01:00'),
            timed('b', 'HB Werk', '2026-10-28T18:00:00+01:00', '2026-10-28T23:00:00+01:00', { status: 'cancelled' }),
            { id: 'c', summary: 'Vrij', start: { date: '2026-10-27' }, end: { date: '2026-10-28' } },
          ],
          nextPageToken: 'p2',
        }),
      )
      .mockReturnValueOnce(respond({ items: [timed('d', 'HB Werk', '2026-10-30T19:00:00+01:00', '2026-10-31T01:00:00+01:00')] }));
    vi.stubGlobal('fetch', fetchMock);

    const events = await fetchEventsInRange('token', from, to, { q: 'HB Werk' });

    expect(events.map((e) => e.id)).toEqual(['a', 'd']);
    expect(events[0]).toEqual({ id: 'a', title: 'HB Werk', start: '2026-10-29T17:00:00.000Z', end: '2026-10-29T23:30:00.000Z' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondUrl = new URL(fetchMock.mock.calls[1][0]);
    expect(secondUrl.searchParams.get('pageToken')).toBe('p2');
    expect(secondUrl.searchParams.get('q')).toBe('HB Werk');
    expect(secondUrl.searchParams.get('singleEvents')).toBe('true');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer token');
  });

  it('marks an expired token so the caller can ask to reconnect', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(respond({}, 401)));
    await expect(fetchEventsInRange('dead', from, to)).rejects.toMatchObject({ code: 'auth' });
  });

  it('reports a network failure in Dutch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(fetchEventsInRange('t', from, to)).rejects.toThrow('Geen verbinding met Google Agenda.');
  });
});

describe('fetchShiftEvents', () => {
  it('keeps events whose title contains the shift title, ignoring case', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        respond({
          items: [
            timed('a', 'hb werk', '2026-10-29T18:00:00+01:00', '2026-10-29T23:00:00+01:00'),
            timed('b', 'Werkoverleg HB', '2026-10-30T10:00:00+01:00', '2026-10-30T11:00:00+01:00'),
            timed('c', 'HB Werk (late)', '2026-10-31T20:00:00+01:00', '2026-11-01T02:00:00+01:00'),
          ],
        }),
      ),
    );
    const now = new Date(2026, 10, 2, 12);
    const { shifts, from, to } = await fetchShiftEvents('t', 'HB Werk', now);
    expect(shifts.map((s) => s.id)).toEqual(['a', 'c']);
    expect(from).toEqual(new Date(2026, 8, 3));
    expect(to).toEqual(new Date(2026, 11, 3));
  });
});
