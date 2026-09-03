/**
 * WebCrypto primitives for the vault.
 *
 * Everything here is deliberately thin — the security comes from using the
 * platform's own AES-GCM and PBKDF2 rather than anything hand-rolled. The two
 * choices that matter:
 *
 *  - PBKDF2-HMAC-SHA256 at a high iteration count, so guessing the password
 *    offline costs the attacker real time per guess;
 *  - AES-GCM, which is authenticated: a tampered ciphertext fails to decrypt
 *    instead of silently returning garbage. That property is what lets
 *    `unlock` treat "decrypt threw" as "wrong password".
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

/** crypto.subtle only exists in a secure context (https, or localhost). */
export function cryptoAvailable() {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
}

export function randomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}

export function toB64(bytes) {
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

export function fromB64(value) {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

export async function deriveKey(password, saltB64, iterations) {
  const material = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromB64(saltB64), iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    // Non-extractable: the derived key cannot be read back out of the
    // CryptoKey, so it never exists anywhere JavaScript can copy it.
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Returns `{ iv, ct }`, both base64. A fresh IV per call is required by GCM. */
export async function encryptString(key, plaintext) {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  return { iv: toB64(iv), ct: toB64(new Uint8Array(ct)) };
}

/** Throws if the key is wrong or the ciphertext was altered. */
export async function decryptString(key, payload) {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(payload.iv) },
    key,
    fromB64(payload.ct),
  );
  return dec.decode(plain);
}
