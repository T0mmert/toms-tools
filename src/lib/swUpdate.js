import { flushWrites, isUnlocked, onLockChange } from './vault';

/**
 * Moves an open app onto a newly deployed version by itself.
 *
 * The service worker (vite-plugin-pwa, autoUpdate) installs a new deploy in
 * the background and takes control, but the page on screen keeps running the
 * old code until it reloads. A reload always ends at the login screen, so it
 * happens at once only when that costs nothing (the app is locked or in the
 * background); otherwise it waits for the next time the tab is hidden, after
 * pending encrypted writes have landed.
 */
export function watchForUpdates() {
  if (!('serviceWorker' in navigator)) return;

  // No controller yet means a first install, not an update: nothing to swap.
  const hadController = !!navigator.serviceWorker.controller;
  let pending = false;
  let reloading = false;

  async function reload() {
    if (reloading) return;
    reloading = true;
    await flushWrites();
    window.location.reload();
  }

  function reloadIfQuiet() {
    if (pending && (document.hidden || !isUnlocked())) reload();
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;
    pending = true;
    reloadIfQuiet();
  });

  document.addEventListener('visibilitychange', () => {
    reloadIfQuiet();
    // Coming back to a long-open tab or installed app: ask for a new deploy
    // instead of waiting for the browser's own (up to daily) check.
    if (!document.hidden) {
      navigator.serviceWorker.getRegistration().then((registration) => registration?.update()).catch(() => {});
    }
  });

  onLockChange(reloadIfQuiet);
}
