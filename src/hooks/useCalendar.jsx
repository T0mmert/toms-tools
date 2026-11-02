import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadGis, requestAccessToken, revokeToken } from '../lib/googleAuth';
import { KEYS } from '../lib/schema';
import { isUnlocked, onLockChange } from '../lib/vault';
import { useStore } from './useStore';

const CalendarContext = createContext(null);

/**
 * One Google Calendar connection for the whole app, shared by the Agenda card
 * and the Uren page, so connecting in one place connects both.
 *
 * It also owns the calendar settings store. useStore instances in the same
 * tab do not see each other's writes, so a second, long-lived instance here
 * would miss a Client ID saved on the card; routing all reads and writes
 * through this one keeps them in step.
 *
 * The access token lives only in this provider's state: never persisted, and
 * revoked (best effort) the moment the vault locks, so a locked app holds no
 * live Google access either.
 */
export function CalendarProvider({ children }) {
  const [settings, setSettings] = useStore(KEYS.calendar);
  const [accessToken, setAccessToken] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const tokenRef = useRef(null);
  const { clientId } = settings;

  useEffect(() => {
    tokenRef.current = accessToken;
  }, [accessToken]);

  useEffect(
    () =>
      onLockChange(() => {
        if (isUnlocked() || !tokenRef.current) return;
        revokeToken(tokenRef.current).catch(() => {});
        tokenRef.current = null;
      }),
    [],
  );

  // As soon as a Client ID exists, load the GIS script ahead of time and try
  // a silent reconnect. Loading it eagerly (rather than inside the Connect
  // click handler) matters: the gap an awaited script load would add between
  // the click and the actual popup risks Safari treating the popup as not
  // directly user-initiated and blocking it.
  useEffect(() => {
    if (!clientId) return undefined;
    let cancelled = false;

    loadGis().catch(() => {});
    requestAccessToken({ clientId, interactive: false })
      .then(({ accessToken: token }) => {
        if (!cancelled) setAccessToken(token);
      })
      .catch(() => {
        // Expected the first time a Client ID is saved, or once a prior
        // session has expired — not an error worth showing.
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  /** Opens Google's consent popup. Throws with a Dutch message on failure. */
  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const { accessToken: token } = await requestAccessToken({ clientId, interactive: true });
      setAccessToken(token);
      return token;
    } finally {
      setConnecting(false);
    }
  }, [clientId]);

  const disconnect = useCallback(async () => {
    try {
      await revokeToken(accessToken);
    } catch {
      // Local state is cleared regardless — see module docs in googleAuth.js.
    }
    setAccessToken(null);
  }, [accessToken]);

  /** A request came back 401: drop the dead token so the UI asks again. */
  const expire = useCallback(() => setAccessToken(null), []);

  const value = useMemo(
    () => ({ settings, setSettings, accessToken, connecting, connect, disconnect, expire }),
    [settings, setSettings, accessToken, connecting, connect, disconnect, expire],
  );

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>;
}

// The hook and provider belong together; splitting them would only add a file.
// eslint-disable-next-line react/only-export-components
export function useCalendar() {
  const value = useContext(CalendarContext);
  if (!value) throw new Error('useCalendar must be used inside CalendarProvider');
  return value;
}
