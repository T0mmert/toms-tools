import { useEffect, useRef } from 'react';
import { subscribeIntents, takeIntent } from '../lib/intents';

/**
 * Runs `handler(type)` for a quick-action intent addressed to `page`: once on
 * mount (the usual case, the page opens because of the intent) and again
 * whenever one arrives while the page is already on screen.
 */
export function useIntent(page, handler) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    function deliver() {
      const type = takeIntent(page);
      if (type) handlerRef.current(type);
    }
    deliver();
    return subscribeIntents(deliver);
  }, [page]);
}
