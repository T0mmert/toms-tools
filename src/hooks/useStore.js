import { useCallback, useEffect, useRef, useState } from 'react';
import { getStore } from '../lib/schema';
import { vaultAdopt, vaultDecryptRaw, vaultGet, vaultSet } from '../lib/vault';

function quarantine(key, raw) {
  try {
    if (raw !== null) window.localStorage.setItem(`${key}.corrupt`, raw);
  } catch {
    // Storage unavailable — nothing to preserve.
  }
}

function parseStore(key, store, raw) {
  if (raw === null) return store.defaultValue();
  try {
    return store.normalize(JSON.parse(raw));
  } catch {
    // Unparseable JSON. Keep a copy under `<key>.corrupt` so the data is
    // recoverable by hand, then carry on with a clean slate rather than
    // throwing during render.
    quarantine(key, raw);
    return store.defaultValue();
  }
}

function readStore(key, store) {
  return parseStore(key, store, vaultGet(key));
}

/**
 * Persistent state backed by the vault, validated through the store schema.
 *
 * Reads come from the vault's decrypted cache, so they stay synchronous even
 * though the underlying localStorage records are encrypted; writes go back
 * through the vault, which re-encrypts them in the background. Values are
 * normalized on read, so a truncated backup, an older data shape or a
 * hand-edited file degrades to something renderable instead of crashing the
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

    lastWritten.current = serialized;
    vaultSet(key, serialized);
  }, [key, value]);

  useEffect(() => {
    let cancelled = false;

    async function onStorage(event) {
      if (event.key !== key) return;
      // Another tab wrote ciphertext; decrypt it before adopting, and skip the
      // write-back so the two tabs cannot ping-pong.
      const plain = await vaultDecryptRaw(event.newValue);
      if (cancelled) return;
      lastWritten.current = plain;
      vaultAdopt(key, plain);
      setValue(parseStore(key, getStore(key), plain));
    }

    window.addEventListener('storage', onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorage);
    };
  }, [key]);

  const update = useCallback((next) => {
    setValue((prev) => (typeof next === 'function' ? next(prev) : next));
  }, []);

  return [value, update];
}
