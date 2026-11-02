import { describe, expect, it, vi } from 'vitest';
import { sendIntent, subscribeIntents, takeIntent } from './intents.js';

describe('intents', () => {
  it('is taken once, by the page it was sent to', () => {
    sendIntent('budget', 'add-expense', 1000);
    expect(takeIntent('notes', 1000)).toBe(null);
    expect(takeIntent('budget', 1000)).toBe('add-expense');
    expect(takeIntent('budget', 1000)).toBe(null);
  });

  it('ignores a stale intent', () => {
    sendIntent('notes', 'new-note', 0);
    expect(takeIntent('notes', 60_000)).toBe(null);
  });

  it('notifies subscribers until they unsubscribe', () => {
    const fn = vi.fn();
    const off = subscribeIntents(fn);
    sendIntent('scrum', 'start-timer');
    off();
    sendIntent('scrum', 'start-timer');
    expect(fn).toHaveBeenCalledTimes(1);
    takeIntent('scrum');
  });
});
