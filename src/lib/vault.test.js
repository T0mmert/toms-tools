import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Each loadApp() call is a fresh "deploy": the vault and storage modules are
 * re-imported against a throwaway verifier for `password`, while the in-memory
 * localStorage below survives between calls, exactly as the browser's would
 * across a password change. Few PBKDF2 rounds keep the suite fast.
 */
const EMAIL = 'test@example.test';
const SENTINEL = 'toms-tools:vault:v1:';
const ITERATIONS = 1000;

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }
  get length() {
    return this.map.size;
  }
  key(i) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k) {
    return this.map.has(k) ? this.map.get(k) : null;
  }
  setItem(k, v) {
    this.map.set(k, String(v));
  }
  removeItem(k) {
    this.map.delete(k);
  }
}

let storage;

async function loadApp(password, saltByte) {
  vi.resetModules();
  vi.doMock('./vaultConfig.js', async () => {
    const { deriveKey, encryptString, toB64 } = await import('./crypto.js');
    const SALT = toB64(new Uint8Array(16).fill(saltByte));
    const key = await deriveKey(password, SALT, ITERATIONS);
    return { SALT, ITERATIONS, SENTINEL, CHECK: await encryptString(key, SENTINEL + EMAIL) };
  });
  const vault = await import('./vault.js');
  const store = await import('./storage.js');
  const sync = await import('./sync.js');
  const { KEYS, getStore } = await import('./schema.js');
  const { parseStore } = await import('../hooks/useStore.js');
  return { vault, store, sync, KEYS, getStore, parseStore };
}

const tomsItems = () => [...storage.map.entries()].filter(([k]) => k.startsWith('toms-tools:'));
const isEnvelopeText = (text) => {
  try {
    const p = JSON.parse(text);
    return p.v === 1 && typeof p.iv === 'string' && typeof p.ct === 'string';
  } catch {
    return false;
  }
};

beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal('window', { localStorage: storage, location: { protocol: 'https:' } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock('./vaultConfig.js');
});

describe('unlock', () => {
  it('opens with the right password only', async () => {
    const { vault } = await loadApp('right-password', 1);
    expect(await vault.unlock(EMAIL, 'wrong-password')).toBe(false);
    expect(await vault.unlock(EMAIL, 'right-password')).toBe(true);
  });
});

describe('S1: nothing readable lands in localStorage', () => {
  it('stores every store as an envelope without the sample text', async () => {
    const { vault, KEYS } = await loadApp('pw', 1);
    await vault.unlock(EMAIL, 'pw');
    Object.values(KEYS).forEach((key, i) => vault.vaultSet(key, JSON.stringify({ secret: `sample-${i}` })));
    await vault.flushWrites();

    const items = tomsItems();
    expect(items.length).toBe(Object.values(KEYS).length);
    items.forEach(([, value]) => {
      expect(isEnvelopeText(value)).toBe(true);
      expect(value).not.toContain('sample-');
    });
  });

  it('keeps an encrypted copy of corrupt JSON, never a plaintext one', async () => {
    const { vault, KEYS, getStore, parseStore } = await loadApp('pw', 1);
    await vault.unlock(EMAIL, 'pw');
    const value = parseStore(KEYS.notes, getStore(KEYS.notes), '{"broken": secret-note');
    await vault.flushWrites();

    expect(value).toEqual([]);
    const copy = storage.getItem(`${KEYS.notes}.corrupt`);
    expect(isEnvelopeText(copy)).toBe(true);
    expect(copy).not.toContain('secret-note');
  });

  it('removes plaintext quarantine left by older versions at unlock', async () => {
    const { vault } = await loadApp('pw', 1);
    storage.setItem('toms-tools:notes.corrupt', '{"old": "plaintext note"}');
    storage.setItem('toms-tools:goals.corrupt', JSON.stringify({ v: 1, iv: 'aaaa', ct: 'bbbb' }));
    await vault.unlock(EMAIL, 'pw');

    expect(storage.getItem('toms-tools:notes.corrupt')).toBe(null);
    expect(storage.getItem('toms-tools:goals.corrupt')).not.toBe(null);
  });
});

describe('S2: encrypted backups', () => {
  it('round-trips through an encrypted backup', async () => {
    const { vault, store, KEYS } = await loadApp('pw', 1);
    await vault.unlock(EMAIL, 'pw');
    vault.vaultSet(KEYS.goals, JSON.stringify([{ id: 'g', title: 'Marathon', target: 42, current: 5 }]));
    const { backup } = await store.encryptedBackup();
    const text = JSON.stringify(backup);
    expect(text).not.toContain('Marathon');

    vault.vaultSet(KEYS.goals, '[]');
    const result = await store.importBackupText(text);
    expect(result).toMatchObject({ imported: 1, encrypted: true });
    expect(JSON.parse(vault.vaultGet(KEYS.goals))[0].title).toBe('Marathon');
  });

  it('rejects a tampered file and writes nothing', async () => {
    const { vault, store, KEYS } = await loadApp('pw', 1);
    await vault.unlock(EMAIL, 'pw');
    vault.vaultSet(KEYS.goals, JSON.stringify([{ id: 'g', title: 'Keep me', target: 1, current: 0 }]));
    const { backup } = await store.encryptedBackup();
    const ct = backup.payload.ct;
    backup.payload.ct = (ct[0] === 'A' ? 'B' : 'A') + ct.slice(1);

    await expect(store.importBackupText(JSON.stringify(backup))).rejects.toMatchObject({ code: 'needs-password' });
    await expect(store.importBackupText(JSON.stringify(backup), 'pw')).rejects.toMatchObject({ code: 'wrong-password' });
    expect(JSON.parse(vault.vaultGet(KEYS.goals))[0].title).toBe('Keep me');
  });

  it('opens a backup from before a password change with the old password only', async () => {
    const before = await loadApp('old-password', 1);
    await before.vault.unlock(EMAIL, 'old-password');
    before.vault.vaultSet(before.KEYS.notes, JSON.stringify([{ id: 'n', text: 'from before', color: 'teal', updatedAt: 1 }]));
    const { backup } = await before.store.encryptedBackup();
    const text = JSON.stringify(backup);

    const after = await loadApp('new-password', 2);
    await after.vault.unlock(EMAIL, 'new-password');
    await expect(after.store.importBackupText(text)).rejects.toMatchObject({ code: 'needs-password' });
    await expect(after.store.importBackupText(text, 'guess')).rejects.toMatchObject({ code: 'wrong-password' });
    expect(after.vault.vaultGet(after.KEYS.notes)).toBe(null);

    await after.store.importBackupText(text, 'old-password');
    expect(JSON.parse(after.vault.vaultGet(after.KEYS.notes))[0].text).toBe('from before');
  });

  it('still accepts a legacy plaintext backup', async () => {
    const { vault, store, KEYS } = await loadApp('pw', 1);
    await vault.unlock(EMAIL, 'pw');
    const legacy = JSON.stringify({ app: 'toms-tools', version: 1, data: { [KEYS.habits]: '[{"id":"h","title":"Lezen","doneDates":[]}]' } });
    expect(await store.importBackupText(legacy)).toMatchObject({ imported: 1, encrypted: false });
  });

  it('refuses a file whose KDF settings would freeze the tab', async () => {
    const { vault, store } = await loadApp('pw', 1);
    await vault.unlock(EMAIL, 'pw');
    const { backup } = await store.encryptedBackup();
    backup.kdf.iterations = 1e12;
    // Not recognised as an encrypted backup, so it falls through to the
    // plaintext validator, which finds no data.
    await expect(store.importBackupText(JSON.stringify(backup), 'pw')).rejects.toThrow('Toms Tools-back-up');
  });
});

describe('S2: sync only ever sends ciphertext', () => {
  const settings = { endpoint: 'https://sync.example.test/data', token: 't' };

  it('pushes an encrypted snapshot', async () => {
    const { vault, sync, KEYS } = await loadApp('pw', 1);
    await vault.unlock(EMAIL, 'pw');
    vault.vaultSet(KEYS.notes, JSON.stringify([{ id: 'n', text: 'private note', color: 'teal', updatedAt: 1 }]));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    await sync.pushData(settings);
    const body = fetchMock.mock.calls[0][1].body;
    expect(body).not.toContain('private note');
    expect(JSON.parse(body)).toMatchObject({ encrypted: true, version: 2 });
  });

  it('accepts a legacy plaintext snapshot once and puts it back encrypted', async () => {
    const { vault, sync, KEYS } = await loadApp('pw', 1);
    await vault.unlock(EMAIL, 'pw');
    const legacy = JSON.stringify({ app: 'toms-tools', version: 1, data: { [KEYS.habits]: '[{"id":"h","title":"Lezen","doneDates":[]}]' } });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(legacy) })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    expect(await sync.pullData(settings)).toMatchObject({ imported: 1, resealed: true });
    const [, put] = fetchMock.mock.calls[1];
    expect(put.method).toBe('PUT');
    expect(put.body).not.toContain('Lezen');
  });

  it('explains a server snapshot from another password instead of failing silently', async () => {
    const before = await loadApp('old-password', 1);
    await before.vault.unlock(EMAIL, 'old-password');
    before.vault.vaultSet(before.KEYS.notes, '[]');
    const { backup } = await before.store.encryptedBackup();

    const after = await loadApp('new-password', 2);
    await after.vault.unlock(EMAIL, 'new-password');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(backup)) }));
    await expect(after.sync.pullData(settings)).rejects.toThrow('ander wachtwoord');
  });
});

describe('S3: a password change never silently destroys data', () => {
  it('blocks unreadable stores until the user imports or discards', async () => {
    const before = await loadApp('old-password', 1);
    await before.vault.unlock(EMAIL, 'old-password');
    before.vault.vaultSet(before.KEYS.notes, JSON.stringify([{ id: 'n', text: 'keep', color: 'teal', updatedAt: 1 }]));
    await before.vault.flushWrites();
    const oldCiphertext = storage.getItem(before.KEYS.notes);

    const after = await loadApp('new-password', 2);
    await after.vault.unlock(EMAIL, 'new-password');
    expect(after.vault.unreadableKeys()).toEqual([after.KEYS.notes]);

    // The app writes defaults and edits on mount; none may reach storage.
    after.vault.vaultSet(after.KEYS.notes, '[]');
    await after.vault.flushWrites();
    expect(storage.getItem(after.KEYS.notes)).toBe(oldCiphertext);

    // Explicit discard: now the current value is written under the new key.
    await after.vault.discardUnreadable();
    expect(after.vault.unreadableKeys()).toEqual([]);
    expect(storage.getItem(after.KEYS.notes)).not.toBe(oldCiphertext);
  });

  it('restores stores whose value is their null default, so none stay blocked', async () => {
    const before = await loadApp('old-password', 1);
    await before.vault.unlock(EMAIL, 'old-password');
    before.vault.vaultSet(before.KEYS.location, 'null');
    before.vault.vaultSet(before.KEYS.notes, '[]');
    await before.vault.flushWrites();
    const { backup } = await before.store.encryptedBackup();

    const after = await loadApp('new-password', 2);
    await after.vault.unlock(EMAIL, 'new-password');
    expect(after.vault.unreadableKeys().sort()).toEqual([after.KEYS.location, after.KEYS.notes].sort());
    await after.store.importBackupText(JSON.stringify(backup), 'old-password');
    expect(after.vault.unreadableKeys()).toEqual([]);
  });

  it('releases a blocked store when a backup replaces it', async () => {
    const before = await loadApp('old-password', 1);
    await before.vault.unlock(EMAIL, 'old-password');
    before.vault.vaultSet(before.KEYS.notes, JSON.stringify([{ id: 'n', text: 'restored', color: 'teal', updatedAt: 1 }]));
    await before.vault.flushWrites();
    const { backup } = await before.store.encryptedBackup();

    const after = await loadApp('new-password', 2);
    await after.vault.unlock(EMAIL, 'new-password');
    await after.store.importBackupText(JSON.stringify(backup), 'old-password');
    await after.vault.flushWrites();

    expect(after.vault.unreadableKeys()).toEqual([]);
    const reopened = await loadApp('new-password', 2);
    await reopened.vault.unlock(EMAIL, 'new-password');
    expect(JSON.parse(reopened.vault.vaultGet(reopened.KEYS.notes))[0].text).toBe('restored');
  });

  it('forgets the blocked list on lock', async () => {
    const before = await loadApp('old-password', 1);
    await before.vault.unlock(EMAIL, 'old-password');
    before.vault.vaultSet(before.KEYS.notes, '[]');
    await before.vault.flushWrites();

    const after = await loadApp('new-password', 2);
    await after.vault.unlock(EMAIL, 'new-password');
    after.vault.lock();
    expect(after.vault.unreadableKeys()).toEqual([]);
  });
});
