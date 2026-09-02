import { useCallback, useEffect, useRef, useState } from 'react';
import { getStore } from '../lib/schema';

function quarantine(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw !== null) window.localStorage.setItem(`${key}.corrupt`, raw);
  } catch {
    // Storage unavailable — nothing to preserve.
  }
}

function readStore(key, store) {
  let raw = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return store.defaultValue();
  }
  if (raw === null) return store.defaultValue();

  try {
    return store.normalize(JSON.parse(raw));
  } catch {
    // Unparseable JSON. Keep a copy under `<key>.corrupt` so the data is
    // recoverable by hand, then carry on with a clean slate rather than
    // throwing during render.
    quarantine(key);
    return store.defaultValue();
  }
}

/**
 * Persistent state backed by localStorage, validated through the store schema.
 *
 * Values are normalized on read, so a truncated backup, an older data shape or
 * a hand-edited file degrades to something renderable instead of crashing the
 * page. Changes made in other tabs are picked up via the `storage` event.
 */
export function useStore(key) {
  const store = getStore(key);
  if (!store) throw new Error(`Unknown store: ${key}`);

  const [value, setValue] = useState(() => readStore(key, store));
  const lastWritten = useRef(null);

  useEffect(() => {
    let serialized;
    try {
      serialized = JSON.stringify(value);
    } catch {
      return;
    }
    if (serialized === lastWritten.current) return;

    try {
      window.localStorage.setItem(key, serialized);
      lastWritten.current = serialized;
    } catch {
      // Quota exceeded or storage blocked (private mode): state stays in memory
      // for this session rather than taking the page down.
    }
  }, [key, value]);

  useEffect(() => {
    function onStorage(event) {
      if (event.key !== key) return;
      lastWritten.current = event.newValue;
      setValue(readStore(key, getStore(key)));
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  const update = useCallback((next) => {
    setValue((prev) => (typeof next === 'function' ? next(prev) : next));
  }, []);

  return [value, update];
}
