import { decryptString, deriveKey } from './crypto';
import { todayISO } from './format';
import { KEYS, STORES, STORAGE_PREFIX, matchesKind } from './schema';
import { isEnvelope, vaultDecrypt, vaultEncrypt, vaultGet, vaultKdf, vaultRemove, vaultSet } from './vault';

const SNAPSHOT_VERSION = 1;
const ENCRYPTED_VERSION = 2;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
// Bounds for a file's own KDF settings: high enough to reject a weakened
// file, low enough that a hostile one cannot freeze the tab.
const MIN_ITERATIONS = 1_000;
const MAX_ITERATIONS = 10_000_000;
const KNOWN_KEYS = Object.values(KEYS);

// Sync settings hold an access token. Backups get shared and synced around, so
// the credential is deliberately kept out of them — and out of anything the
// sync endpoint receives.
//
// KEYS.calendar is deliberately NOT in this set: it holds a Google OAuth
// Client ID, which isn't a secret and grants nothing by itself, and the hours
// and lock settings. The access token the Client ID is used to request is
// never persisted at all.
const PRIVATE_KEYS = new Set([KEYS.sync]);
export const SYNCABLE_KEYS = KNOWN_KEYS.filter((key) => !PRIVATE_KEYS.has(key));

/**
 * Snapshot of every known store, decrypted. Only schema-known keys are
 * included, so a backup never carries quarantined debris or keys from another
 * app sharing the origin. It leaves this module sealed (encryptedBackup) unless
 * the user explicitly asks for a plaintext export.
 */
export function collectData() {
  const data = {};
  SYNCABLE_KEYS.forEach((key) => {
    const raw = vaultGet(key);
    if (raw !== null) data[key] = raw;
  });
  return data;
}

function snapshot() {
  return {
    app: 'toms-tools',
    version: SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    data: collectData(),
  };
}

/**
 * The snapshot sealed with the session key, plus the salt and iteration count
 * that key was derived with. Those make the file openable with the password it
 * was made under, even after the app's password has changed since.
 */
export async function encryptedBackup() {
  const plain = snapshot();
  const backup = {
    app: 'toms-tools',
    version: ENCRYPTED_VERSION,
    encrypted: true,
    exportedAt: plain.exportedAt,
    kdf: vaultKdf(),
    payload: await vaultEncrypt(JSON.stringify(plain)),
  };
  return { backup, count: Object.keys(plain.data).length };
}

function download(text, filename) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Encrypted by default; `{ plaintext: true }` only after the user confirmed. */
export async function exportData({ plaintext = false } = {}) {
  if (plaintext) {
    download(JSON.stringify(snapshot(), null, 2), `toms-tools-backup-${todayISO()}-onversleuteld.json`);
    return;
  }
  const { backup } = await encryptedBackup();
  download(JSON.stringify(backup, null, 2), `toms-tools-backup-${todayISO()}.json`);
}

function isEncryptedFile(parsed) {
  const kdf = parsed?.kdf;
  return (
    parsed?.app === 'toms-tools' &&
    parsed.encrypted === true &&
    isEnvelope(parsed.payload) &&
    typeof kdf?.salt === 'string' &&
    Number.isInteger(kdf.iterations) &&
    kdf.iterations >= MIN_ITERATIONS &&
    kdf.iterations <= MAX_ITERATIONS
  );
}

function codedError(message, code) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/**
 * Turns backup text into the plain snapshot text parseBackup expects.
 *
 * Plaintext (legacy) backups pass through unchanged. Encrypted ones open with
 * the session key; if that fails the file was made under another password, so
 * this throws code 'needs-password' until called with `password`, which is
 * stretched with the file's own salt. A wrong password or an altered file
 * throws code 'wrong-password'. Nothing is written either way.
 */
export async function openBackup(text, password) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Dit is geen geldig JSON-bestand.');
  }
  if (!isEncryptedFile(parsed)) return { text, encrypted: false };

  if (password === undefined) {
    try {
      return { text: await vaultDecrypt(parsed.payload), encrypted: true };
    } catch {
      throw codedError('Deze back-up is met een ander wachtwoord gemaakt.', 'needs-password');
    }
  }
  try {
    const key = await deriveKey(password, parsed.kdf.salt, parsed.kdf.iterations);
    return { text: await decryptString(key, parsed.payload), encrypted: true };
  } catch {
    throw codedError('Onjuist wachtwoord, of het bestand is beschadigd.', 'wrong-password');
  }
}

/**
 * Validate a parsed backup without touching storage.
 *
 * Every value is run through its store's normalizer first, so anything the app
 * could not safely render is rejected here rather than being written and
 * crashing a page later.
 */
export function parseBackup(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Dit is geen geldig JSON-bestand.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Onverwachte inhoud — dit lijkt geen Toms Tools-back-up.');
  }
  if (!parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
    throw new Error('Onverwachte inhoud — dit lijkt geen Toms Tools-back-up.');
  }

  const accepted = {};
  const skipped = [];

  Object.entries(parsed.data).forEach(([key, raw]) => {
    if (!key.startsWith(STORAGE_PREFIX) || !STORES[key]) {
      skipped.push(key);
      return;
    }
    // Never let a file configure where data gets sent. Without this, opening
    // someone else's "backup" could silently point sync at their server and
    // start uploading everything.
    if (PRIVATE_KEYS.has(key)) {
      skipped.push(key);
      return;
    }
    try {
      // Backups store each value as the raw JSON string it had in localStorage.
      const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
      // Some stores default to null (no weather location yet). That is a
      // valid value to restore, not damage, and skipping it would leave the
      // store blocked after a password change.
      if (value === null && STORES[key].defaultValue() === null) {
        accepted[key] = 'null';
        return;
      }
      // Wrong shape entirely: treat the key as damaged and leave whatever the
      // user already has in place, rather than overwriting it with an empty
      // default.
      if (!matchesKind(key, value)) {
        skipped.push(key);
        return;
      }
      accepted[key] = JSON.stringify(STORES[key].normalize(value));
    } catch {
      skipped.push(key);
    }
  });

  if (Object.keys(accepted).length === 0) {
    throw new Error('Geen bruikbare Toms Tools-data in dit bestand gevonden.');
  }

  return { accepted, skipped };
}

/** An import is an explicit choice, so it also replaces unreadable stores. */
export function applyBackup(accepted) {
  Object.entries(accepted).forEach(([key, raw]) => vaultSet(key, raw, { replace: true }));
}

/** Open, validate and apply a backup. See openBackup for the password flow. */
export async function importBackupText(text, password) {
  const opened = await openBackup(text, password);
  const { accepted, skipped } = parseBackup(opened.text);
  applyBackup(accepted);
  return { imported: Object.keys(accepted).length, skipped: skipped.length, encrypted: opened.encrypted };
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Kon het bestand niet lezen.'));
    reader.readAsText(file);
  });
}

export async function readBackupFile(file) {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Bestand is te groot voor een Toms Tools-back-up.');
  }
  return readFileAsText(file);
}

export function clearAllData() {
  KNOWN_KEYS.forEach((key) => vaultRemove(key));
}
