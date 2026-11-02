import { useEffect, useRef, useState } from 'react';
import { importBackupText, readBackupFile } from '../lib/storage';

/**
 * "Import a backup" as a button. Plain and current encrypted backups import
 * straight away; a backup made under an earlier password asks for that
 * password inline (never through a prompt() that shows what is typed) and
 * nothing is written until it opens.
 */
function BackupImport({ className, statusClassName = 'data-status', children }) {
  const fileRef = useRef(null);
  const passwordRef = useRef(null);
  const [pendingText, setPendingText] = useState(null);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (pendingText) passwordRef.current?.focus();
  }, [pendingText]);

  useEffect(() => {
    if (!status || status.type !== 'error') return undefined;
    const id = setTimeout(() => setStatus(null), 8000);
    return () => clearTimeout(id);
  }, [status]);

  async function run(text, backupPassword) {
    try {
      const { imported, skipped } = await importBackupText(text, backupPassword);
      setPendingText(null);
      setPassword('');
      const note = skipped > 0 ? ` ${skipped} overgeslagen.` : '';
      setStatus({ type: 'ok', text: `${imported} onderdelen hersteld.${note} Herladen...` });
      setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      if (err.code === 'needs-password') {
        setPendingText(text);
        setStatus({ type: 'info', text: 'Deze back-up is met een ander wachtwoord gemaakt. Vul dat wachtwoord in.' });
      } else if (err.code === 'wrong-password') {
        setPassword('');
        setStatus({ type: 'error', text: err.message });
      } else {
        setPendingText(null);
        setStatus({ type: 'error', text: err.message });
      }
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const confirmed = window.confirm(
      'Dit overschrijft je huidige Toms Tools-gegevens in deze browser met de inhoud van het back-upbestand. Doorgaan?',
    );
    if (!confirmed) return;

    try {
      run(await readBackupFile(file));
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  }

  function handlePassword(e) {
    e.preventDefault();
    if (password) run(pendingText, password);
  }

  function cancel() {
    setPendingText(null);
    setPassword('');
    setStatus(null);
  }

  return (
    <>
      <button type="button" className={className} onClick={() => fileRef.current?.click()}>
        {children}
      </button>
      <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleFileChange} hidden />

      {pendingText && (
        <form className="backup-password" onSubmit={handlePassword}>
          <label>
            Wachtwoord van deze back-up
            <input
              ref={passwordRef}
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <div className="backup-password-actions">
            <button type="submit" disabled={!password}>
              Ontsleutelen
            </button>
            <button type="button" onClick={cancel}>
              Annuleren
            </button>
          </div>
        </form>
      )}

      {status && (
        <p className={`${statusClassName} ${status.type}`} role="status">
          {status.text}
        </p>
      )}
    </>
  );
}

export default BackupImport;
