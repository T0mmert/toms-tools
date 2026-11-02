import { useState } from 'react';
import { KEYS } from '../lib/schema';
import { discardUnreadable, unreadableKeys } from '../lib/vault';
import BackupImport from './BackupImport';

const LABELS = {
  [KEYS.budget]: 'Budget',
  [KEYS.recurring]: 'Vaste lasten',
  [KEYS.board]: 'Scrum Board',
  [KEYS.history]: 'Backlog-verloop',
  [KEYS.timer]: 'Timer',
  [KEYS.sessions]: 'Tijdregistratie',
  [KEYS.notes]: 'Notities',
  [KEYS.goals]: 'Doelen',
  [KEYS.habits]: 'Gewoontes',
  [KEYS.theme]: 'Thema',
  [KEYS.sync]: 'Sync-instellingen',
  [KEYS.location]: 'Weerlocatie',
  [KEYS.calendar]: 'Agenda- en uureninstellingen',
  [KEYS.tabs]: 'Tabbladen',
  [KEYS.hours]: 'Uren',
};

const CONFIRM_WORD = 'VERWIJDEREN';

/**
 * Shown after unlock when some stores exist but will not decrypt, usually
 * because they were written under a previous password. They are kept as they
 * are until the user picks one of two explicit ways out.
 */
function UnreadableBanner() {
  const [keys, setKeys] = useState(unreadableKeys);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');

  if (keys.length === 0) return null;

  const names = keys.map((key) => LABELS[key] || key);
  const one = keys.length === 1;
  // The sync token is never written to a backup, so no import can bring it back.
  const syncLocked = keys.includes(KEYS.sync);

  async function handleDiscard(e) {
    e.preventDefault();
    if (typed !== CONFIRM_WORD) return;
    await discardUnreadable();
    setKeys([]);
  }

  return (
    <section className="unreadable-banner" aria-labelledby="unreadable-title">
      <h2 id="unreadable-title">
        {keys.length} {one ? 'onderdeel kan' : 'onderdelen kunnen'} niet gelezen worden (ander wachtwoord?)
      </h2>
      <p>
        {names.join(', ')}. {one ? 'Het blijft' : 'Ze blijven'} onaangeroerd bewaard, en wijzigingen daarin worden niet
        opgeslagen tot je hieronder kiest. Importeer de versleutelde back-up van vóór de wachtwoordwissel, of verwijder
        de oude gegevens.
        {syncLocked && ' Sync-instellingen staan nooit in een back-up: verwijder ze en vul adres en token opnieuw in.'}
      </p>
      <div className="unreadable-actions">
        <BackupImport className="unreadable-btn primary" statusClassName="unreadable-status">
          Back-up importeren
        </BackupImport>
        {!confirming && (
          <button type="button" className="unreadable-btn" onClick={() => setConfirming(true)}>
            Verwijderen…
          </button>
        )}
      </div>
      {confirming && (
        <form className="unreadable-confirm" onSubmit={handleDiscard}>
          <label>
            Typ {CONFIRM_WORD} om deze gegevens definitief te wissen
            <input type="text" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
          </label>
          <div className="unreadable-actions">
            <button type="submit" className="unreadable-btn danger" disabled={typed !== CONFIRM_WORD}>
              Definitief verwijderen
            </button>
            <button
              type="button"
              className="unreadable-btn"
              onClick={() => {
                setConfirming(false);
                setTyped('');
              }}
            >
              Annuleren
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default UnreadableBanner;
