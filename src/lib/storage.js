import { todayISO } from './format';

const PREFIX = 'toms-tools:';

export function exportData() {
  const data = {};
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX))
    .forEach((k) => {
      data[k] = localStorage.getItem(k);
    });

  const payload = { exportedAt: new Date().toISOString(), data };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `toms-tools-backup-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || typeof parsed.data !== 'object') {
          reject(new Error('Ongeldig back-upbestand.'));
          return;
        }
        const keys = Object.keys(parsed.data).filter((k) => k.startsWith(PREFIX));
        if (keys.length === 0) {
          reject(new Error('Geen Toms Tools-data gevonden in dit bestand.'));
          return;
        }
        keys.forEach((k) => localStorage.setItem(k, parsed.data[k]));
        resolve(keys.length);
      } catch {
        reject(new Error('Kon het bestand niet lezen als JSON.'));
      }
    };
    reader.onerror = () => reject(new Error('Kon het bestand niet lezen.'));
    reader.readAsText(file);
  });
}
