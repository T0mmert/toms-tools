/**
 * The vault: the login check, and the encrypted-at-rest layer beneath it.
 *
 * Why the login is not just an overlay
 * ------------------------------------
 * This app is static files on a public host, so a password screen that merely
 * hides the UI is worth nothing — anyone can delete the overlay in DevTools.
 * Instead the password *is* the decryption key: every store is written to
 * localStorage as AES-GCM ciphertext, and the key is derived from the password
 * at unlock. Getting past the login screen without the password therefore
 * yields an app with nothing readable in it.
 *
 * The key exists only in this module's `sessionKey`, only while the tab is
 * open, and is non-extractable — it is never written to storage, never sent
 * anywhere, and cannot be copied back out of the CryptoKey. Backups and sync
 * snapshots are sealed with it too (`vaultEncrypt`), so nothing leaves the
 * browser in plaintext unless the user explicitly asks for it.
 *
 * Synchronous reads over async crypto
 * -----------------------------------
 * crypto.subtle is async but React state is not, so unlocking decrypts every
 * store once into `cache`. Components then read plaintext synchronously
 * exactly as before; writes update the cache immediately and re-encrypt to
 * localStorage in the background, serialized per key so a burst of edits
 * cannot land out of order.
 *
 * Unreadable is not absent
 * ------------------------
 * A record that exists but will not decrypt was almost always written under a
 * previous password. Treating it as empty would let the next write overwrite
 * it for good, so such keys are `blocked`: they read as empty for this session
 * but are never written until the user imports a backup or explicitly
 * discards them.
 */

import { cryptoAvailable, decryptString, deriveKey, encryptString } from './crypto';
import { KEYS, STORAGE_PREFIX } from './schema';
import { CHECK, ITERATIONS, SALT, SENTINEL } from './vaultConfig';

const STORE_KEYS = Object.values(KEYS);

let sessionKey = null;
const cache = new Map();
const writeQueues = new Map();
const blocked = new Set();

const listeners = new Set();

function notify() {
  listeners.forEach((fn) => fn());
}

export function onLockChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isUnlocked() {
  return sessionKey !== null;
}

export { cryptoAvailable };

/** Ciphertext written by this module; anything else is legacy plaintext. */
export function isEnvelope(value) {
  return (
    value && typeof value === 'object' && value.v === 1 && typeof value.iv === 'string' && typeof value.ct === 'string'
  );
}

async function readEncrypted(key) {
  let raw;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return { value: null, needsMigration: false, unreadable: false };
  }
  if (raw === null) return { value: null, needsMigration: false, unreadable: false };

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Not JSON at all — leave it for useStore to quarantine.
    return { value: raw, needsMigration: true, unreadable: false };
  }

  if (!isEnvelope(parsed)) {
    // Written before the vault existed. Keep it, and flag it so unlock
    // re-writes it encrypted.
    return { value: raw, needsMigration: true, unreadable: false };
  }

  try {
    return { value: await decryptString(sessionKey, parsed), needsMigration: false, unreadable: false };
  } catch {
    // Right password, unreadable record: written under a previous password
    // or tampered with. Not the same as absent — see "Unreadable is not
    // absent" above.
    return { value: null, needsMigration: false, unreadable: true };
  }
}

/**
 * Quarantined copies used to be written in plaintext. Drop any that are left,
 * so decrypted data never lingers in localStorage; current ones are sealed.
 */
function purgePlaintextQuarantine() {
  try {
    const storage = window.localStorage;
    for (let i = storage.length - 1; i >= 0; i -= 1) {
      const key = storage.key(i);
      if (!key || !key.startsWith(STORAGE_PREFIX) || !key.endsWith('.corrupt')) continue;
      let parsed = null;
      try {
        parsed = JSON.parse(storage.getItem(key));
      } catch {
        // Not JSON, so certainly not an envelope.
      }
      if (!isEnvelope(parsed)) storage.removeItem(key);
    }
  } catch {
    // Storage unavailable — nothing to clean.
  }
}

async function writeNow(key) {
  const value = cache.get(key);
  try {
    if (value === undefined) {
      window.localStorage.removeItem(key);
      return;
    }
    const payload = await encryptString(sessionKey, value);
    window.localStorage.setItem(key, JSON.stringify({ v: 1, ...payload }));
  } catch {
    // Quota, blocked storage, or a lock landing mid-write: the value stays in
    // the cache for this session rather than taking the page down.
  }
}

/**
 * Chained per key so writes land in the order they were made. Each run reads
 * the *current* cache value, so a burst of edits collapses to one final write.
 */
function scheduleWrite(key) {
  const previous = writeQueues.get(key) ?? Promise.resolve();
  const next = previous.then(() => (sessionKey ? writeNow(key) : undefined)).catch(() => {});
  writeQueues.set(key, next);
  return next;
}

export function flushWrites() {
  return Promise.all([...writeQueues.values()]);
}

/**
 * Try to open the vault. Returns true on success.
 *
 * Verification is the decryption itself: AES-GCM authenticates its ciphertext,
 * so a wrong password makes `decryptString` throw. No password or hash of one
 * is stored to compare against.
 */
export async function unlock(email, password) {
  const key = await deriveKey(password, SALT, ITERATIONS);

  let proof;
  try {
    proof = await decryptString(key, CHECK);
  } catch {
    return false;
  }
  if (proof !== SENTINEL + email.trim().toLowerCase()) return false;

  sessionKey = key;
  blocked.clear();
  purgePlaintextQuarantine();

  const migrations = [];
  await Promise.all(
    STORE_KEYS.map(async (storeKey) => {
      const { value, needsMigration, unreadable } = await readEncrypted(storeKey);
      if (value !== null) cache.set(storeKey, value);
      if (needsMigration) migrations.push(storeKey);
      if (unreadable) blocked.add(storeKey);
    }),
  );

  // Anything left over from before the vault existed gets re-written encrypted
  // on the way in, so plaintext does not linger in localStorage.
  migrations.forEach(scheduleWrite);

  notify();
  return true;
}

export function lock() {
  sessionKey = null;
  cache.clear();
  writeQueues.clear();
  blocked.clear();
  notify();
}

/** Lock after any in-flight write has landed, so the last edit is kept. */
export async function lockAfterFlush() {
  await flushWrites();
  lock();
}

export function vaultGet(key) {
  return cache.has(key) ? cache.get(key) : null;
}

/**
 * Store a value. A blocked (unreadable) key only changes in memory; pass
 * `replace: true` when the user explicitly replaces it, as an import does.
 */
export function vaultSet(key, serialized, { replace = false } = {}) {
  if (replace) blocked.delete(key);
  cache.set(key, serialized);
  if (!blocked.has(key)) scheduleWrite(key);
}

/** Explicit removal (the reset button); this also releases a blocked key. */
export function vaultRemove(key) {
  blocked.delete(key);
  cache.delete(key);
  scheduleWrite(key);
}

/** Stores that exist but could not be decrypted at unlock. */
export function unreadableKeys() {
  return [...blocked];
}

/** The user chose to give up the unreadable records: overwrite them now. */
export function discardUnreadable() {
  const keys = [...blocked];
  blocked.clear();
  keys.forEach(scheduleWrite);
  return flushWrites();
}

/** Decrypt a raw localStorage value written by another tab. */
export async function vaultDecryptRaw(raw) {
  if (raw === null || sessionKey === null) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!isEnvelope(parsed)) return raw;
    return await decryptString(sessionKey, parsed);
  } catch {
    return null;
  }
}

/** Adopt a value another tab wrote, without echoing it back to storage. */
export function vaultAdopt(key, value) {
  if (value === null) cache.delete(key);
  else cache.set(key, value);
}

/** Seal text with the session key (which itself never leaves this module). */
export async function vaultEncrypt(plaintext) {
  if (!sessionKey) throw new Error('De kluis is vergrendeld.');
  return { v: 1, ...(await encryptString(sessionKey, plaintext)) };
}

/** Throws when the envelope was sealed under another password or altered. */
export async function vaultDecrypt(envelope) {
  if (!sessionKey) throw new Error('De kluis is vergrendeld.');
  return decryptString(sessionKey, envelope);
}

/**
 * How the session key was derived. Written into encrypted backups so a file
 * made under an earlier password can still be opened with that password.
 */
export function vaultKdf() {
  return { name: 'PBKDF2-SHA256', salt: SALT, iterations: ITERATIONS };
}

export { STORE_KEYS };
