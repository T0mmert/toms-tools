import { useEffect, useState } from 'react';
import { useCalendar } from '../hooks/useCalendar';
import { clearAllData, exportData } from '../lib/storage';
import { lockAfterFlush } from '../lib/vault';
import BackupImport from './BackupImport';

const ICONS = {
  export: (
    <>
      <path d="M10 3v9.5M6.5 9L10 12.5 13.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 14.5V16a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  import: (
    <>
      <path d="M10 12.5V3M6.5 6.5L10 3 13.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 14.5V16a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  reset: (
    <>
      <path d="M4 10a6 6 0 1 0 1.9-4.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3.5 3.5V7H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

const LOCK_CHOICES = [1, 2, 5, 10, 15, 30];

function DataControls({ onOpenSync }) {
  const { settings, setSettings } = useCalendar();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!status) return undefined;
    const id = setTimeout(() => setStatus(null), 6000);
    return () => clearTimeout(id);
  }, [status]);

  async function handleExport(plaintext) {
    if (plaintext) {
      const confirmed = window.confirm(
        'Dit bestand is niet versleuteld: iedereen die het opent kan al je gegevens lezen. Gebruik normaal de versleutelde export. Toch doorgaan?',
      );
      if (!confirmed) return;
    }
    try {
      await exportData({ plaintext });
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  }

  function handleReset() {
    const confirmed = window.confirm(
      'Alle Toms Tools-gegevens in deze browser worden gewist. Dit kan niet ongedaan worden gemaakt. Doorgaan?',
    );
    if (!confirmed) return;
    clearAllData();
    window.location.reload();
  }

  return (
    <div className="data-controls">
      <button type="button" className="data-btn" onClick={() => handleExport(false)}>
        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          {ICONS.export}
        </svg>
        Exporteren
      </button>
      <BackupImport className="data-btn">
        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          {ICONS.import}
        </svg>
        Importeren
      </BackupImport>
      <button type="button" className="data-btn" onClick={() => onOpenSync?.()}>
        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M3.5 8.5a6.5 6.5 0 0 1 11-3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M16.5 11.5a6.5 6.5 0 0 1-11 3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M14.5 2.5v3h-3M5.5 17.5v-3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Synchroniseren
      </button>
      <button type="button" className="data-btn" onClick={lockAfterFlush}>
        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="3.5" y="8.5" width="13" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6.8 8.5V6.5a3.2 3.2 0 0 1 6.4 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Vergrendelen
      </button>
      <label className="data-lock">
        Automatisch na
        <select
          value={settings.idleLockMinutes}
          onChange={(e) => setSettings((prev) => ({ ...prev, idleLockMinutes: Number(e.target.value) }))}
        >
          {LOCK_CHOICES.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} min
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="data-btn danger" onClick={handleReset}>
        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          {ICONS.reset}
        </svg>
        Wissen
      </button>
      <button type="button" className="data-btn subtle" onClick={() => handleExport(true)}>
        Onversleuteld exporteren
      </button>
      {status && (
        <p className={`data-status ${status.type}`} role="status">
          {status.text}
        </p>
      )}
    </div>
  );
}

export default DataControls;
