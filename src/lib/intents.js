/**
 * One-shot hand-off from wherever a quick action is chosen (start page,
 * command palette) to the page that carries it out.
 *
 * Only the active page is mounted, so the target usually mounts after the
 * intent is sent and takes it then; when it is already on screen, the
 * subscription delivers it straight away. An intent nobody takes within a few
 * seconds is stale and ignored, so a later visit never replays it.
 */
const MAX_AGE_MS = 10_000;

let pending = null;
const listeners = new Set();

export function sendIntent(page, type, now = Date.now()) {
  pending = { page, type, at: now };
  listeners.forEach((fn) => fn());
}

/** Returns the intent type for `page` and clears it, or null. */
export function takeIntent(page, now = Date.now()) {
  if (!pending || pending.page !== page) return null;
  const intent = pending;
  pending = null;
  return now - intent.at > MAX_AGE_MS ? null : intent.type;
}

export function subscribeIntents(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
