/**
 * Stable unique id. Uses the native crypto UUID where available (all current
 * browsers, secure contexts) and falls back to a random string otherwise —
 * which also covers plain-http LAN access to a self-hosted copy.
 */
export function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
