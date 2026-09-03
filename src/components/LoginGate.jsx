import { useEffect, useRef, useState } from 'react';
import forestImg from '../assets/dashboard-forest.webp';
import { cryptoAvailable, isUnlocked, onLockChange, unlock } from '../lib/vault';
import './LoginGate.css';

const GATE_STYLE = { '--gate-photo': `url(${forestImg})` };

/**
 * The lock screen.
 *
 * Deriving the key is deliberately slow (600k PBKDF2 rounds, roughly half a
 * second), which is what makes guessing expensive. On top of that, repeated
 * failures in this tab add a growing delay — that does nothing against someone
 * attacking the ciphertext offline, but it does stop anyone sitting at the
 * keyboard from working through a list by hand.
 */
const BACKOFF_AFTER = 3;
const BACKOFF_STEP_MS = 1500;
const BACKOFF_MAX_MS = 30_000;

function LoginGate({ children }) {
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const failures = useRef(0);
  const emailRef = useRef(null);

  useEffect(() => onLockChange(() => setUnlocked(isUnlocked())), []);

  useEffect(() => {
    if (!unlocked) emailRef.current?.focus();
  }, [unlocked]);

  if (!cryptoAvailable()) {
    return (
      <div className="gate" style={GATE_STYLE}>
        <div className="gate-card">
          <h1 className="gate-title">Toms Tools</h1>
          <p className="gate-error" role="alert">
            Deze pagina heeft een beveiligde verbinding nodig (https). Open hem via
            het https-adres en probeer opnieuw.
          </p>
        </div>
      </div>
    );
  }

  if (unlocked) return children;

  async function onSubmit(event) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError('');

    if (failures.current >= BACKOFF_AFTER) {
      const wait = Math.min((failures.current - BACKOFF_AFTER + 1) * BACKOFF_STEP_MS, BACKOFF_MAX_MS);
      await new Promise((r) => setTimeout(r, wait));
    }

    let ok = false;
    try {
      ok = await unlock(email, password);
    } catch {
      ok = false;
    }

    if (ok) {
      failures.current = 0;
      setPassword('');
      setUnlocked(true);
    } else {
      failures.current += 1;
      // One message for both fields: saying which half was wrong would tell an
      // attacker whether they had guessed a valid address.
      setError('Onjuiste combinatie van e-mailadres en wachtwoord.');
      setPassword('');
    }
    setBusy(false);
  }

  return (
    <div className="gate" style={GATE_STYLE}>
      <form className="gate-card" onSubmit={onSubmit}>
        <div className="gate-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M8 10V7.5a4 4 0 0 1 8 0V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="12" cy="15.5" r="1.4" fill="currentColor" />
          </svg>
        </div>

        <h1 className="gate-title">
          Toms <em>Tools</em>
        </h1>
        <p className="gate-sub">Meld je aan om je gegevens te ontsleutelen.</p>

        <label className="gate-label" htmlFor="gate-email">
          E-mailadres
        </label>
        <input
          id="gate-email"
          ref={emailRef}
          className="gate-input"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="gate-label" htmlFor="gate-password">
          Wachtwoord
        </label>
        <input
          id="gate-password"
          className="gate-input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <p className="gate-error" role="alert">
            {error}
          </p>
        )}

        <button className="gate-submit" type="submit" disabled={busy}>
          {busy ? 'Ontsleutelen…' : 'Ontgrendelen'}
        </button>

        <p className="gate-note">
          Je gegevens staan versleuteld op dit apparaat. Zonder dit wachtwoord zijn
          ze niet te lezen — ook niet door mij.
        </p>
      </form>
    </div>
  );
}

export default LoginGate;
