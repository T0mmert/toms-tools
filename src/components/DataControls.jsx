import { useRef, useState } from 'react';
import { exportData, importData } from '../lib/storage';

function DataControls() {
  const fileRef = useRef(null);
  const [status, setStatus] = useState(null);

  function handleImportClick() {
    fileRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const confirmed = window.confirm(
      'Dit overschrijft je huidige Toms Tools-data in deze browser met de inhoud van het back-upbestand. Doorgaan?',
    );
    if (!confirmed) return;

    try {
      const count = await importData(file);
      setStatus({ type: 'ok', text: `${count} datasets geïmporteerd. Herladen...` });
      setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  }

  return (
    <div className="data-controls">
      <button type="button" className="data-btn" onClick={exportData}>
        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 3v9.5M6.5 9L10 12.5 13.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3.5 14.5V16a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Exporteren
      </button>
      <button type="button" className="data-btn" onClick={handleImportClick}>
        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 12.5V3M6.5 6.5L10 3 13.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3.5 14.5V16a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Importeren
      </button>
      <input ref={fileRef} type="file" accept="application/json" onChange={handleFileChange} hidden />
      {status && <p className={`data-status ${status.type}`}>{status.text}</p>}
    </div>
  );
}

export default DataControls;
