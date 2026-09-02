import { useEffect, useState } from 'react';
import { useStore } from '../hooks/useStore';
import { KEYS } from '../lib/schema';
import { isMixedContentBlocked, pullData, pushData, validateEndpoint } from '../lib/sync';
import './SyncPanel.css';

/** Mounted only while open, so the draft always starts from saved settings. */
function SyncPanel({ onClose }) {
  const [settings, setSettings] = useStore(KEYS.sync);
  const [draft, setDraft] = useState(settings);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const endpointProblem = draft.endpoint ? validateEndpoint(draft.endpoint) : null;
  const blocked = isMixedContentBlocked(draft.endpoint);

  function save() {
    setSettings(draft);
    setStatus({ type: 'ok', text: 'Instellingen opgeslagen.' });
  }

  async function run(action, label) {
    setBusy(true);
    setStatus(null);
    try {
      const result = await action({ ...draft });
      setSettings({ ...draft, lastSyncedAt: Date.now() });
      setStatus({ type: 'ok', text: label(result) });
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sync-backdrop" onMouseDown={onClose}>
      <div
        className="sync-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Synchronisatie"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sync-head">
          <h2>Synchronisatie</h2>
          <button type="button" className="sync-close" onClick={onClose} aria-label="Sluiten">
            ×
          </button>
        </div>

        <p className="sync-intro">
          Stuur je gegevens naar je eigen server, zodat dezelfde data op meerdere apparaten
          beschikbaar is. Er wordt niets verstuurd zolang je hieronder geen adres invult.
        </p>

        <label className="sync-field">
          <span>Sync-adres</span>
          <input
            type="url"
            placeholder="https://server.thuis/toms-tools"
            value={draft.endpoint}
            onChange={(e) => setDraft((d) => ({ ...d, endpoint: e.target.value }))}
          />
        </label>

        <label className="sync-field">
          <span>Token</span>
          <input
            type="password"
            placeholder="Gedeeld geheim"
            autoComplete="off"
            value={draft.token}
            onChange={(e) => setDraft((d) => ({ ...d, token: e.target.value }))}
          />
        </label>

        {blocked && (
          <p className="sync-warning">
            Deze pagina draait via https, dus de browser blokkeert verkeer naar een http-adres.
            Gebruik https op je server, of draai Toms Tools lokaal.
          </p>
        )}
        {endpointProblem && !blocked && <p className="sync-warning">{endpointProblem}</p>}

        <div className="sync-actions">
          <button type="button" className="sync-btn" onClick={save} disabled={busy}>
            Opslaan
          </button>
          <button
            type="button"
            className="sync-btn primary"
            disabled={busy || !draft.endpoint || !!endpointProblem}
            onClick={() => run(pushData, (count) => `${count} onderdelen verstuurd.`)}
          >
            Nu versturen
          </button>
          <button
            type="button"
            className="sync-btn"
            disabled={busy || !draft.endpoint || !!endpointProblem}
            onClick={() =>
              run(pullData, (r) => {
                setTimeout(() => window.location.reload(), 800);
                return `${r.imported} onderdelen opgehaald. Herladen…`;
              })
            }
          >
            Nu ophalen
          </button>
        </div>

        {status && (
          <p className={`sync-status ${status.type}`} role="status">
            {status.text}
          </p>
        )}

        {settings.lastSyncedAt && (
          <p className="sync-meta">
            Laatst gesynchroniseerd: {new Date(settings.lastSyncedAt).toLocaleString('nl-NL')}
          </p>
        )}

        <p className="sync-note">
          Ophalen overschrijft de gegevens in deze browser. Het token wordt lokaal opgeslagen en
          nooit meegenomen in een back-upbestand.
        </p>
      </div>
    </div>
  );
}

export default SyncPanel;
