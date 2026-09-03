import { todayISO } from './format';
import { KEYS, STORES, STORAGE_PREFIX, matchesKind } from './schema';
import { vaultGet, vaultRemove, vaultSet } from './vault';

const BACKUP_VERSION = 1;
const KNOWN_KEYS = Object.values(KEYS);

// Sync settings hold an access token. Backups get shared and synced around, so
// the credential is deliberately kept out of them — and out of anything the
// sync endpoint receives.
//
// KEYS.calendar is deliberately NOT in this set: it only ever holds a Google
// OAuth Client ID, which isn't a secret and grants nothing by itself — the
// access token it's used to request is never persisted at all.
const PRIVATE_KEYS = new Set([KEYS.sync]);
export const SYNCABLE_KEYS = KNOWN_KEYS.filter((key) => !PRIVATE_KEYS.has(key));

/**
 * Snapshot of every known store. Only schema-known keys are included, so a
 * backup never carries quarantined debris or keys from another app sharing
 * the origin.
 */
export function collectData() {
  const data = {};
  SYNCABLE_KEYS.forEach((key) => {
    // Read decrypted, so a backup file stays a plain readable JSON document
    // rather than a blob that is worthless without this exact password.
    const raw = vaultGet(key);
    if (raw !== null) data[key] = raw;
  });
  return data;
}

export function exportData() {
  const payload = {
    app: 'toms-tools',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: collectData(),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `toms-tools-backup-${todayISO()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

export function applyBackup(accepted) {
  Object.entries(accepted).forEach(([key, raw]) => vaultSet(key, raw));
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Kon het bestand niet lezen.'));
    reader.readAsText(file);
  });
}

export async function importData(file) {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Bestand is te groot voor een Toms Tools-back-up.');
  }
  const text = await readFileAsText(file);
  const { accepted, skipped } = parseBackup(text);
  applyBackup(accepted);
  return { imported: Object.keys(accepted).length, skipped: skipped.length };
}

export function clearAllData() {
  KNOWN_KEYS.forEach((key) => vaultRemove(key));
}
