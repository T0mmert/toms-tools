import { useEffect, useState } from 'react';
import { useStore } from '../hooks/useStore';
import { fetchUpcomingEvents } from '../lib/calendar';
import { daysUntil, formatRelativeDays } from '../lib/format';
import { loadGis, requestAccessToken, revokeToken } from '../lib/googleAuth';
import { KEYS } from '../lib/schema';
import './CalendarCard.css';

function CalendarCard() {
  const [settings, setSettings] = useStore(KEYS.calendar);
  const [editing, setEditing] = useState(!settings.clientId);
  const [draftClientId, setDraftClientId] = useState(settings.clientId);

  const [accessToken, setAccessToken] = useState(null);
  const [events, setEvents] = useState(null);
  const [error, setError] = useState(null);
  const [connecting, setConnecting] = useState(false);

  // As soon as a Client ID exists, load the GIS script ahead of time and try
  // a silent reconnect. Loading it eagerly (rather than inside the Connect
  // click handler) matters: the gap an awaited script load would add between
  // the click and the actual popup risks Safari treating the popup as not
  // directly user-initiated and blocking it.
  useEffect(() => {
    if (!settings.clientId) return undefined;
    let cancelled = false;

    loadGis().catch(() => {});
    requestAccessToken({ clientId: settings.clientId, interactive: false })
      .then(({ accessToken: token }) => {
        if (!cancelled) setAccessToken(token);
      })
      .catch(() => {
        // Expected the first time a Client ID is saved, or once a prior
        // session has expired — not an error worth showing.
      });

    return () => {
      cancelled = true;
    };
  }, [settings.clientId]);

  useEffect(() => {
    if (!accessToken) return undefined;
    let cancelled = false;
    setEvents(null);
    setError(null);

    fetchUpcomingEvents(accessToken)
      .then((data) => {
        if (!cancelled) setEvents(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.code === 'auth') {
          setAccessToken(null);
          setError({ type: 'expired', text: 'Je sessie is verlopen.' });
        } else {
          setError({ type: 'generic', text: err.message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const { accessToken: token } = await requestAccessToken({
        clientId: settings.clientId,
        interactive: true,
      });
      setAccessToken(token);
    } catch (err) {
      setError({ type: 'generic', text: err.message });
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    try {
      await revokeToken(accessToken);
    } catch {
      // Local state is cleared regardless — see module docs in googleAuth.js.
    }
    setAccessToken(null);
    setEvents(null);
    setError(null);
  }

  function handleSaveSettings(e) {
    e.preventDefault();
    setSettings({ clientId: draftClientId.trim() });
    setEditing(false);
  }

  const connected = !!accessToken;

  return (
    <section className="widget-card panel calendar-card">
      <div className="widget-head">
        <h2>Agenda</h2>
        <button type="button" className="widget-link" onClick={() => setEditing((v) => !v)}>
          Instellingen
        </button>
      </div>

      {(editing || !settings.clientId) && (
        <form className="calendar-settings" onSubmit={handleSaveSettings}>
          <p className="calendar-intro">
            Plak hier je Google OAuth Client ID om je agenda te tonen. Er wordt niets opgehaald
            tot je verbinding maakt.
          </p>
          <input
            type="text"
            placeholder="Client ID"
            aria-label="Google OAuth Client ID"
            value={draftClientId}
            onChange={(e) => setDraftClientId(e.target.value)}
          />
          <div className="calendar-actions">
            <button type="submit">Opslaan</button>
            {settings.clientId && (
              <button type="button" className="calendar-secondary" onClick={handleDisconnect}>
                Verbinding verbreken
              </button>
            )}
          </div>
        </form>
      )}

      {!editing && settings.clientId && !connected && !connecting && !error && (
        <>
          <p className="empty-state">Nog niet verbonden met Google Agenda.</p>
          <button type="button" className="calendar-connect" onClick={handleConnect}>
            Verbinden met Google
          </button>
        </>
      )}

      {connecting && <div className="widget-skeleton" />}

      {error && !connecting && (
        <div className="widget-error-block">
          <p className="widget-error">{error.text}</p>
          <div className="widget-error-actions">
            <button type="button" className="widget-retry" onClick={handleConnect}>
              {error.type === 'expired' ? 'Opnieuw verbinden' : 'Opnieuw proberen'}
            </button>
          </div>
        </div>
      )}

      {!editing && connected && !error && events === null && <div className="widget-skeleton" />}

      {!editing && connected && !error && events && events.length === 0 && (
        <p className="empty-state">Geen aankomende afspraken.</p>
      )}

      {!editing && connected && !error && events && events.length > 0 && (
        <ul className="panel-list">
          {events.map((event) => {
            const days = daysUntil(event.start);
            return (
              <li key={event.id}>
                <span className="panel-item-name">{event.title}</span>
                <span className={`panel-tag due${days <= 0 ? ' soon' : ''}`}>
                  {formatRelativeDays(days)}
                </span>
                <span className="panel-item-meta">
                  {event.allDay
                    ? 'Hele dag'
                    : event.start.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {!editing && connected && (
        <button type="button" className="calendar-disconnect" onClick={handleDisconnect}>
          Verbinding verbreken
        </button>
      )}
    </section>
  );
}

export default CalendarCard;
