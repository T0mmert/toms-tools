import { applyBackup, collectData, parseBackup } from './storage';

/**
 * Sync against a self-hosted endpoint.
 *
 * Deliberately explicit rather than clever: the payload is the same snapshot
 * the export button produces, and merging is last-write-wins at the whole-
 * snapshot level. Field-level merging across six independent stores would need
 * per-record clocks — worth doing one day, but not something to fake.
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
  const payload = {
    app: 'toms-tools',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: collectData(),
  };
  await request(settings, {
    method: 'PUT',
    headers: headers(settings.token),
    body: JSON.stringify(payload),
  });
  return Object.keys(payload.data).length;
}

export async function pullData(settings) {
  const response = await request(settings, {
    method: 'GET',
    headers: headers(settings.token),
  });

  const text = await response.text();
  if (!text.trim()) throw new Error('De server heeft nog geen gegevens.');

  // Runs through exactly the same validation as a file import, so a
  // compromised or buggy server cannot write unchecked values into storage.
  const { accepted, skipped } = parseBackup(text);
  applyBackup(accepted);
  return { imported: Object.keys(accepted).length, skipped: skipped.length };
}
