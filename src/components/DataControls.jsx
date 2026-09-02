import { useEffect, useRef, useState } from 'react';
import { clearAllData, exportData, importData } from '../lib/storage';

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

function DataControls() {
  const fileRef = useRef(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!status || status.type === 'ok') return undefined;
    const id = setTimeout(() => setStatus(null), 6000);
    return () => clearTimeout(id);
  }, [status]);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const confirmed = window.confirm(
      'Dit overschrijft je huidige Toms Tools-gegevens in deze browser met de inhoud van het back-upbestand. Doorgaan?',
    );
    if (!confirmed) return;

    try {
      const { imported, skipped } = await importData(file);
      const note = skipped > 0 ? ` ${skipped} overgeslagen.` : '';
      setStatus({ type: 'ok', text: `${imported} onderdelen hersteld.${note} Herladen...` });
      setTimeout(() => window.location.reload(), 900);
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
      <button type="button" className="data-btn" onClick={exportData}>
        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          {ICONS.export}
        </svg>
        Exporteren
      </button>
      <button type="button" className="data-btn" onClick={() => fileRef.current?.click()}>
        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          {ICONS.import}
        </svg>
        Importeren
      </button>
      <button type="button" className="data-btn danger" onClick={handleReset}>
        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          {ICONS.reset}
        </svg>
        Wissen
      </button>
      <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleFileChange} hidden />
      {status && (
        <p className={`data-status ${status.type}`} role="status">
          {status.text}
        </p>
      )}
    </div>
  );
}

export default DataControls;
