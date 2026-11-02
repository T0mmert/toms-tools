import { encryptedBackup, importBackupText } from './storage';

/**
 * Sync against a self-hosted endpoint.
 *
 * Deliberately explicit rather than clever: the payload is the same encrypted
 * backup the export button produces, so the server only ever stores
 * ciphertext. Merging is last-write-wins at the whole-snapshot level.
 * Field-level merging across independent stores would need per-record clocks —
 * worth doing one day, but not something to fake.
 */

export function isMixedContentBlocked(endpoint) {
  try {
    const url = new URL(endpoint);
    return window.location.protocol === 'https:' && url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function validateEndpoint(endpoint) {
  if (!endpoint) return 'Vul eerst een sync-adres in.';
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    return 'Dat is geen geldige URL.';
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return 'Alleen http:// en https:// worden ondersteund.';
  }
  if (isMixedContentBlocked(endpoint)) {
    return 'Deze pagina draait op https, dus de browser blokkeert een http-adres. Gebruik https op je server, of open Toms Tools lokaal.';
  }
  return null;
}

function headers(token) {
  const base = { 'Content-Type': 'application/json' };
  if (token) base.Authorization = `Bearer ${token}`;
  return base;
}

async function request(settings, options) {
  const problem = validateEndpoint(settings.endpoint);
  if (problem) throw new Error(problem);

  let response;
  try {
    response = await fetch(settings.endpoint, options);
  } catch {
    // fetch() gives no detail on CORS/DNS/refused, so say what is actually
    // actionable rather than echoing "Failed to fetch".
    throw new Error('Geen verbinding met de server. Draait hij, en staat CORS aan?');
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error('Token geweigerd door de server.');
  }
  if (!response.ok) {
    throw new Error(`Server antwoordde met ${response.status}.`);
  }
  return response;
}

export async function pushData(settings) {
  const { backup, count } = await encryptedBackup();
  await request(settings, {
    method: 'PUT',
    headers: headers(settings.token),
    body: JSON.stringify(backup),
  });
  return count;
}

export async function pullData(settings) {
  const response = await request(settings, {
    method: 'GET',
    headers: headers(settings.token),
  });

  const text = await response.text();
  if (!text.trim()) throw new Error('De server heeft nog geen gegevens.');

  // Runs through exactly the same opening and validation as a file import, so
  // a compromised or buggy server cannot write unchecked values into storage.
  let result;
  try {
    result = await importBackupText(text);
  } catch (err) {
    if (err.code !== 'needs-password') throw err;
    throw new Error(
      'De gegevens op de server zijn met een ander wachtwoord versleuteld. Verstuur eerst vanaf een apparaat dat het huidige wachtwoord gebruikt.',
    );
  }

  // An older plaintext snapshot is accepted this once, then replaced on the
  // server by its encrypted form.
  if (!result.encrypted) await pushData(settings);
  return { imported: result.imported, skipped: result.skipped, resealed: !result.encrypted };
}
