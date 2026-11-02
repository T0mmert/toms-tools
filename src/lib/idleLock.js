/**
 * Locks the vault after a stretch without input, or once the tab has been in
 * the background for a while: a device left unattended should not keep the
 * key and the decrypted data in memory.
 *
 * Activity only records a timestamp; a slow interval compares against it, so
 * busy pointer movement costs nothing. Browsers throttle timers in background
 * tabs, so the hidden-tab rule is also checked the moment the tab comes back.
 */
export const DEFAULT_IDLE_MINUTES = 5;
export const HIDDEN_LOCK_MS = 2 * 60_000;

const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];

export function startIdleLock({
  idleMs,
  onLock,
  hiddenMs = HIDDEN_LOCK_MS,
  target = window,
  doc = document,
  now = () => Date.now(),
  checkEveryMs = 15_000,
}) {
  let lastActivity = now();
  let hiddenSince = doc.hidden ? now() : null;
  let locked = false;

  function check() {
    if (locked) return;
    const t = now();
    const idle = t - lastActivity >= idleMs;
    const away = hiddenSince !== null && t - hiddenSince >= hiddenMs;
    if (idle || away) {
      locked = true;
      onLock();
    }
  }

  function onActivity() {
    lastActivity = now();
  }

  function onVisibility() {
    if (doc.hidden) {
      hiddenSince = now();
    } else {
      check();
      hiddenSince = null;
    }
  }

  const options = { passive: true, capture: true };
  ACTIVITY_EVENTS.forEach((type) => target.addEventListener(type, onActivity, options));
  doc.addEventListener('visibilitychange', onVisibility);
  const timer = setInterval(check, checkEveryMs);

  return function stop() {
    ACTIVITY_EVENTS.forEach((type) => target.removeEventListener(type, onActivity, options));
    doc.removeEventListener('visibilitychange', onVisibility);
    clearInterval(timer);
  };
}
