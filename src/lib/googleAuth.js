/**
 * Thin wrapper around Google Identity Services (GIS).
 *
 * This app is static files on a public host with no backend, so there is
 * nowhere to keep an OAuth client secret. GIS's token-client flow is built
 * for exactly that case: it hands back a short-lived access token straight to
 * the browser using only a Client ID, which — unlike a secret — is fine to
 * ship in client-side code (Google's own docs do the same). The trade-off is
 * no refresh token: a dead token means asking again, silently if possible.
 */

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const RESPONSE_TIMEOUT_MS = 10_000;

let gisPromise = null;

/** Injects the GIS script once and resolves when it's ready to use. */
export function loadGis() {
  if (gisPromise) return gisPromise;

  gisPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Kon Google niet laden.'));
    document.head.appendChild(script);
  }).catch((err) => {
    // A failed load should not be cached — retrying later (e.g. after the
    // network comes back) should get a fresh attempt, not the same rejection.
    gisPromise = null;
    throw err;
  });

  return gisPromise;
}

// One token client per Client ID, reused across calls rather than rebuilt
// every time — GIS treats each initTokenClient() call as a distinct client.
const tokenClients = new Map();

// GIS's token client has a single callback slot, not one per call. If a
// second request comes in while one is still pending, initTokenClient's own
// callback would silently switch targets and strand the first caller's
// promise forever. Track in-flight requests per Client ID so a concurrent
// call reuses the same promise instead.
const pending = new Map();

function getTokenClient(clientId) {
  if (tokenClients.has(clientId)) return tokenClients.get(clientId);

  let currentSettle = null;
  const client = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: CALENDAR_SCOPE,
    callback: (response) => currentSettle?.(response),
  });

  tokenClients.set(clientId, { client, setSettle: (fn) => { currentSettle = fn; } });
  return tokenClients.get(clientId);
}

/**
 * Requests an access token. `interactive: false` asks silently (no popup) —
 * this only succeeds if the browser still has an active Google session and
 * the user already granted consent before; it's how a reload avoids making
 * the user click "Connect" every time. `interactive: true` opens Google's
 * consent popup.
 */
export async function requestAccessToken({ clientId, interactive }) {
  if (pending.has(clientId)) return pending.get(clientId);

  const request = (async () => {
    await loadGis();
    const { client, setSettle } = getTokenClient(clientId);

    const response = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        setSettle(null);
        reject(new Error('Geen antwoord van Google.'));
      }, RESPONSE_TIMEOUT_MS);

      setSettle((res) => {
        clearTimeout(timer);
        setSettle(null);
        resolve(res);
      });

      client.requestAccessToken({ prompt: interactive ? '' : 'none' });
    });

    if (response.error) {
      throw new Error(response.error_description || 'Verbinden is niet gelukt of geannuleerd.');
    }

    return {
      accessToken: response.access_token,
      // expires_in is seconds; keep a margin so a request doesn't start
      // against a token that expires mid-flight.
      expiresAt: Date.now() + (Number(response.expires_in) || 0) * 1000 - 30_000,
    };
  })();

  pending.set(clientId, request);
  try {
    return await request;
  } finally {
    pending.delete(clientId);
  }
}

/** Best-effort revoke. Callers should clear local state regardless of outcome. */
export async function revokeToken(accessToken) {
  if (!accessToken) return;
  await loadGis();
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, RESPONSE_TIMEOUT_MS);
    window.google.accounts.oauth2.revoke(accessToken, () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
