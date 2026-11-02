import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PageIcon from '../components/PageIcon';
import { useCalendar } from '../hooks/useCalendar';
import { useIntent } from '../hooks/useIntent';
import { useStore } from '../hooks/useStore';
import { fetchShiftEvents } from '../lib/calendar';
import {
  addDays,
  formatEuros,
  formatHours,
  formatMonth,
  fromLocalISO,
  shiftMonth,
  toMonthKey,
  todayISO,
} from '../lib/format';
import {
  adjustWorked,
  dailyHours,
  grossPay,
  groupByWeek,
  isToConfirm,
  manualShift,
  mergeCalendarShifts,
  monthTotals,
  restoreShift,
  settleStatuses,
  shiftsToCsv,
  weekTotals,
} from '../lib/hours';
import { createId } from '../lib/id';
import { KEYS } from '../lib/schema';
import './HoursPage.css';

const ICON = {
  prev: 'M12 5l-5 5 5 5',
  next: 'M8 5l5 5-5 5',
  gear: 'M10 7.4a2.6 2.6 0 1 0 0 5.2a2.6 2.6 0 0 0 0-5.2ZM10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4',
  chevron: 'M5 8l5 5 5-5',
  minus: 'M5 10h10',
  plus: 'M10 5v10M5 10h10',
};

const FILTERS = [
  { id: 'all', label: 'Alles', test: () => true },
  { id: 'open', label: 'Te bevestigen', test: isToConfirm },
  { id: 'done', label: 'Bevestigd', test: (row) => row.confirmed },
];

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const clock = (iso) => new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
const dayLabel = (iso) =>
  capitalize(fromLocalISO(iso).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }));

function weekRange(mondayIso) {
  const monday = fromLocalISO(mondayIso);
  const sunday = addDays(monday, 6);
  const month = { month: 'short' };
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()} – ${sunday.getDate()} ${sunday.toLocaleDateString('nl-NL', month)}`;
  }
  const short = { day: 'numeric', month: 'short' };
  return `${monday.toLocaleDateString('nl-NL', short)} – ${sunday.toLocaleDateString('nl-NL', short)}`;
}

function statusOf(row) {
  if (row.status === 'skipped') return { label: 'Overgeslagen', tone: 'skipped' };
  if (row.status === 'planned') return { label: 'Gepland', tone: 'planned' };
  return row.confirmed ? { label: 'Bevestigd', tone: 'done' } : { label: 'Te bevestigen', tone: 'open' };
}

const parseNumber = (text) => parseFloat(String(text).replace(',', '.'));

function downloadCsv(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function ShiftRow({ row, expanded, onToggle, onChange, onRemove }) {
  const status = statusOf(row);
  const edited = row.source === 'calendar' && row.workedHours !== row.plannedHours;

  return (
    <li className={`hours-row glass tone-${status.tone}`}>
      <div className="hours-row-main">
        <button type="button" className="hours-row-toggle" aria-expanded={expanded} onClick={onToggle}>
          <span className="hours-dot" aria-hidden="true" />
          <span className="hours-row-text">
            <span className="hours-row-day">{dayLabel(row.date)}</span>
            <span className="hours-row-meta">
              {clock(row.start)} – {clock(row.end)} · {status.label}
              {row.missingFromCalendar && <span className="hours-missing"> · verdwenen uit agenda</span>}
            </span>
          </span>
          <span className="hours-row-hours">
            <span className={row.status === 'skipped' ? 'hours-struck' : undefined}>{formatHours(row.workedHours)}</span>
            {edited && <span className="hours-row-planned">gepland {formatHours(row.plannedHours)}</span>}
          </span>
        </button>
        {status.tone === 'open' && !expanded && (
          <button type="button" className="hours-confirm" onClick={() => onChange((r) => ({ ...r, confirmed: true }))}>
            Bevestig
          </button>
        )}
      </div>

      {expanded && (
        <div className="hours-row-edit">
          {row.status !== 'skipped' && (
            <div className="hours-stepper" role="group" aria-label="Gewerkte uren">
              <button type="button" aria-label="Kwartier minder" onClick={() => onChange((r) => adjustWorked(r, -0.25))}>
                <PageIcon d={ICON.minus} strokeWidth={1.8} />
              </button>
              <output aria-live="polite">{formatHours(row.workedHours)}</output>
              <button type="button" aria-label="Kwartier meer" onClick={() => onChange((r) => adjustWorked(r, 0.25))}>
                <PageIcon d={ICON.plus} strokeWidth={1.8} />
              </button>
            </div>
          )}
          <div className="hours-row-actions">
            {status.tone === 'open' && (
              <button type="button" className="hours-btn primary" onClick={() => onChange((r) => ({ ...r, confirmed: true }))}>
                Bevestigen
              </button>
            )}
            {row.status === 'skipped' ? (
              <button type="button" className="hours-btn" onClick={() => onChange((r) => restoreShift(r))}>
                Herstellen
              </button>
            ) : (
              <button
                type="button"
                className="hours-btn"
                onClick={() => onChange((r) => ({ ...r, status: 'skipped', confirmed: false }))}
              >
                Overslaan
              </button>
            )}
            {row.source === 'manual' && (
              <button type="button" className="hours-btn danger" onClick={onRemove}>
                Verwijderen
              </button>
            )}
          </div>
          {row.note && <p className="hours-row-note">{row.note}</p>}
        </div>
      )}
    </li>
  );
}

function AddShiftForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({ date: todayISO(), startTime: '18:00', endTime: '00:00', note: '' });
  const dateRef = useRef(null);

  useEffect(() => {
    dateRef.current?.focus();
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.date || !form.startTime || !form.endTime) return;
    onAdd(form);
  }

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <form className="hours-panel glass" onSubmit={handleSubmit}>
      <h2 className="hours-panel-title">Dienst toevoegen</h2>
      <div className="hours-fields">
        <label>
          Datum
          <input ref={dateRef} type="date" value={form.date} onChange={set('date')} required />
        </label>
        <label>
          Begin
          <input type="time" value={form.startTime} onChange={set('startTime')} required />
        </label>
        <label>
          Einde
          <input type="time" value={form.endTime} onChange={set('endTime')} required />
        </label>
      </div>
      <label className="hours-field-wide">
        Notitie (optioneel)
        <input type="text" value={form.note} onChange={set('note')} />
      </label>
      <p className="hours-help">Een einde vóór het begin telt als nachtdienst. Uren worden afgerond op een kwartier.</p>
      <div className="hours-panel-actions">
        <button type="submit" className="hours-btn primary">
          Toevoegen
        </button>
        <button type="button" className="hours-btn" onClick={onCancel}>
          Annuleren
        </button>
      </div>
    </form>
  );
}

function SettingsForm({ settings, onSave, onCancel }) {
  const [draft, setDraft] = useState({
    shiftTitle: settings.shiftTitle,
    hourlyRate: String(settings.hourlyRate).replace('.', ','),
    vakantiegeldPct: String(settings.vakantiegeldPct).replace('.', ','),
    breakMinutes: String(settings.breakMinutes),
  });

  function handleSubmit(e) {
    e.preventDefault();
    const keep = (value, fallback) => (Number.isFinite(value) && value >= 0 ? value : fallback);
    onSave({
      shiftTitle: draft.shiftTitle.trim() || settings.shiftTitle,
      hourlyRate: keep(parseNumber(draft.hourlyRate), settings.hourlyRate),
      vakantiegeldPct: keep(parseNumber(draft.vakantiegeldPct), settings.vakantiegeldPct),
      breakMinutes: keep(Math.round(parseNumber(draft.breakMinutes)), settings.breakMinutes),
    });
  }

  const set = (field) => (e) => setDraft((d) => ({ ...d, [field]: e.target.value }));

  return (
    <form className="hours-panel glass" onSubmit={handleSubmit}>
      <h2 className="hours-panel-title">Instellingen</h2>
      <div className="hours-fields">
        <label>
          Uurtarief (€)
          <input type="text" inputMode="decimal" value={draft.hourlyRate} onChange={set('hourlyRate')} />
        </label>
        <label>
          Vakantiegeld (%)
          <input type="text" inputMode="decimal" value={draft.vakantiegeldPct} onChange={set('vakantiegeldPct')} />
        </label>
        <label>
          Pauze per dienst (min)
          <input type="text" inputMode="numeric" value={draft.breakMinutes} onChange={set('breakMinutes')} />
        </label>
      </div>
      <label className="hours-field-wide">
        Titel van diensten in je agenda
        <input type="text" value={draft.shiftTitle} onChange={set('shiftTitle')} />
      </label>
      <p className="hours-help">Bruto is een schatting: uren × tarief + vakantiegeld. Pauze geldt voor nieuwe en bijgewerkte diensten.</p>
      <div className="hours-panel-actions">
        <button type="submit" className="hours-btn primary">
          Opslaan
        </button>
        <button type="button" className="hours-btn" onClick={onCancel}>
          Annuleren
        </button>
      </div>
    </form>
  );
}

function HoursPage({ onNavigate }) {
  const [log, setLog] = useStore(KEYS.hours);
  const { settings, setSettings, accessToken, connecting, connect, expire } = useCalendar();

  const [now] = useState(() => new Date());
  const [month, setMonth] = useState(() => toMonthKey());
  const [filter, setFilter] = useState('all');
  const [listOpen, setListOpen] = useState(true);
  const [openWeeks, setOpenWeeks] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [panel, setPanel] = useState(null);
  // `token` is the access token the last import ran with, so "importing" can
  // be derived for a fresh token without setting state inside the effect.
  const [sync, setSync] = useState({ token: null, busy: false, at: null, error: null });

  // Statuses are settled on read (and on every write below), so a planned
  // shift that has ended shows as "te bevestigen" without a calendar fetch.
  const shifts = useMemo(() => settleStatuses(log, now), [log, now]);
  const update = useCallback((fn) => setLog((prev) => fn(settleStatuses(prev))), [setLog]);
  const updateRow = (id, fn) => update((rows) => rows.map((row) => (row.id === id ? fn(row) : row)));

  useIntent('hours', (type) => {
    if (type === 'add-shift') setPanel('add');
  });

  /** Fetches shifts and resolves to a result to apply; never rejects. */
  const fetchImport = useCallback(
    async (token) => {
      const at = new Date();
      try {
        const { from, to, shifts: events } = await fetchShiftEvents(token, settings.shiftTitle, at);
        const merge = (prev) => mergeCalendarShifts(prev, events, { now: at, from, to, breakMinutes: settings.breakMinutes });
        return { token, at, merge, error: null };
      } catch (err) {
        return { token, at: null, merge: null, error: err };
      }
    },
    [settings.shiftTitle, settings.breakMinutes],
  );

  const applyImport = useCallback(
    ({ token, at, merge, error }) => {
      if (merge) setLog(merge);
      if (error?.code === 'auth') expire();
      const message = error ? (error.code === 'auth' ? 'Je Google-sessie is verlopen.' : error.message) : null;
      setSync({ token, busy: false, at, error: message });
    },
    [setLog, expire],
  );

  // Import whenever a token is available while the page is open: on load
  // after a silent reconnect, and right after connecting.
  useEffect(() => {
    if (!accessToken) return undefined;
    let cancelled = false;
    fetchImport(accessToken).then((result) => {
      if (!cancelled) applyImport(result);
    });
    return () => {
      cancelled = true;
    };
  }, [accessToken, fetchImport, applyImport]);

  function syncNow() {
    setSync((s) => ({ ...s, busy: true, error: null }));
    fetchImport(accessToken).then(applyImport);
  }

  const importing = sync.busy || (!!accessToken && sync.token !== accessToken);

  async function handleConnect() {
    try {
      await connect();
    } catch (err) {
      setSync((s) => ({ ...s, error: err.message }));
    }
  }

  const { hourlyRate: rate, vakantiegeldPct: pct } = settings;
  const totals = monthTotals(shifts, month);
  const days = dailyHours(shifts, month);
  const dayMax = Math.max(7, ...days.map((d) => d.worked + d.planned));
  const monthShifts = shifts.filter((row) => row.date.startsWith(`${month}-`));
  const activeFilter = FILTERS.find((f) => f.id === filter);
  const visible = monthShifts.filter(activeFilter.test);
  const weeks = groupByWeek(visible);
  const isWeekOpen = (key, index) => (openWeeks ? openWeeks.has(key) : index === 0);
  const allOpen = weeks.length > 0 && weeks.every((week, i) => isWeekOpen(week.key, i));

  const currentMonth = toMonthKey(now);
  const strip = [
    { label: 'Deze week', totals: weekTotals(shifts, now) },
    { label: 'Deze maand', totals: monthTotals(shifts, currentMonth) },
    { label: 'Vorige maand', totals: monthTotals(shifts, shiftMonth(currentMonth, -1)) },
  ];

  function changeMonth(next) {
    setMonth(next);
    setOpenWeeks(null);
    setExpanded(null);
  }

  function toggleWeek(key, open) {
    setOpenWeeks((prev) => {
      const next = new Set(prev ?? (weeks.length ? [weeks[0].key] : []));
      if (open) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function confirmMonth() {
    update((rows) => rows.map((row) => (row.date.startsWith(`${month}-`) && isToConfirm(row) ? { ...row, confirmed: true } : row)));
  }

  function addShift(form) {
    const shift = manualShift(form, { id: `m-${createId()}`, now: new Date(), breakMinutes: settings.breakMinutes });
    update((rows) => [...rows, shift]);
    setPanel(null);
    changeMonth(shift.date.slice(0, 7));
  }

  function exportCsv() {
    const ok = window.confirm('Dit CSV-bestand is niet versleuteld: iedereen die het opent kan je uren lezen. Doorgaan?');
    if (ok) downloadCsv(shiftsToCsv(monthShifts), `uren-${month}.csv`);
  }

  const monthName = capitalize(formatMonth(month));

  return (
    <div className="hours-page">
      <h1 className="sr-only">Uren</h1>

      <div className="hours-nav">
        <div className="hours-month">
          <button type="button" className="hours-icon-btn" aria-label="Vorige maand" onClick={() => changeMonth(shiftMonth(month, -1))}>
            <PageIcon d={ICON.prev} strokeWidth={1.8} />
          </button>
          <span className="hours-month-label" aria-live="polite">
            {monthName}
          </span>
          <button type="button" className="hours-icon-btn" aria-label="Volgende maand" onClick={() => changeMonth(shiftMonth(month, 1))}>
            <PageIcon d={ICON.next} strokeWidth={1.8} />
          </button>
          {month !== currentMonth && (
            <button type="button" className="hours-today" onClick={() => changeMonth(currentMonth)}>
              Nu
            </button>
          )}
        </div>
        <button
          type="button"
          className="hours-icon-btn"
          aria-label="Instellingen"
          aria-expanded={panel === 'settings'}
          onClick={() => setPanel((p) => (p === 'settings' ? null : 'settings'))}
        >
          <PageIcon d={ICON.gear} />
        </button>
      </div>

      {panel === 'settings' && (
        <SettingsForm
          settings={settings}
          onCancel={() => setPanel(null)}
          onSave={(next) => {
            setSettings((prev) => ({ ...prev, ...next }));
            setPanel(null);
          }}
        />
      )}

      <div className="hours-sync" role="status">
        {!settings.clientId ? (
          <>
            <span>Verbind Google Agenda om diensten te importeren. Stel eerst een Client ID in op de Agenda-kaart.</span>
            <button type="button" className="hours-link" onClick={() => onNavigate?.('dashboard')}>
              Naar Dashboard
            </button>
          </>
        ) : accessToken ? (
          <>
            <span>
              {importing
                ? 'Diensten ophalen…'
                : sync.error
                  ? sync.error
                  : sync.at
                    ? `Agenda bijgewerkt om ${clock(sync.at.toISOString())}`
                    : 'Verbonden met Google Agenda'}
            </span>
            <button type="button" className="hours-link" disabled={importing} onClick={syncNow}>
              Synchroniseren
            </button>
          </>
        ) : (
          <>
            <span>{sync.error ? `${sync.error} Je lokale uren blijven gewoon bruikbaar.` : 'Verbind Google Agenda om diensten te importeren.'}</span>
            <button type="button" className="hours-link" disabled={connecting} onClick={handleConnect}>
              {sync.error ? 'Opnieuw verbinden' : 'Verbinden'}
            </button>
          </>
        )}
      </div>

      <section className="hours-hero glass" aria-label={`Overzicht ${monthName}`}>
        <span className="hours-kicker">Gewerkt</span>
        <div className="hours-big">
          <span className="hours-total">{formatHours(totals.worked)}</span>
          <span className="hours-gross">{formatEuros(grossPay(totals.worked, rate, pct))} bruto</span>
        </div>
        {totals.planned > 0 && (
          <p className="hours-planned">
            + {formatHours(totals.planned)} gepland ({formatEuros(grossPay(totals.planned, rate, pct))})
          </p>
        )}
        <div className="hours-bars" role="img" aria-label={`Uren per dag in ${formatMonth(month)}`}>
          {days.map((d) => {
            const px = (h) => `${Math.max(3, Math.round((h / dayMax) * 40))}px`;
            return (
              <span className="hours-day" key={d.date}>
                {d.planned > 0 && <span className="hours-seg planned" style={{ height: px(d.planned) }} />}
                {d.worked > 0 && <span className="hours-seg worked" style={{ height: px(d.worked) }} />}
                {d.worked + d.planned === 0 && <span className="hours-seg none" />}
              </span>
            );
          })}
        </div>
      </section>

      <div className="hours-strip glass">
        {strip.map((cell) => (
          <div className="hours-strip-cell" key={cell.label}>
            <span className="hours-strip-label">{cell.label}</span>
            <span className="hours-strip-value">{formatHours(cell.totals.worked)}</span>
            <span className="hours-strip-sub">{formatEuros(grossPay(cell.totals.worked, rate, pct))} bruto</span>
          </div>
        ))}
      </div>

      <div className="hours-filters" role="group" aria-label="Filter diensten">
        {FILTERS.map((f) => (
          <button
            type="button"
            key={f.id}
            className={`hours-chip${filter === f.id ? ' active' : ''}`}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="hours-list-head">
        <button type="button" className="hours-list-toggle" aria-expanded={listOpen} onClick={() => setListOpen((v) => !v)}>
          <PageIcon d={ICON.chevron} strokeWidth={1.8} />
          Diensten ({visible.length})
          {totals.toConfirm > 0 && ` · ${totals.toConfirm} te bevestigen`}
        </button>
        {listOpen && weeks.length > 0 && (
          <button
            type="button"
            className="hours-link"
            onClick={() => setOpenWeeks(allOpen ? new Set() : new Set(weeks.map((w) => w.key)))}
          >
            {allOpen ? 'Alles dicht' : 'Alles open'}
          </button>
        )}
      </div>

      {listOpen && (
        <div className="hours-weeks">
          {monthShifts.length === 0 ? (
            <p className="hours-empty">Geen diensten in {formatMonth(month)}.</p>
          ) : weeks.length === 0 ? (
            <p className="hours-empty">Geen diensten met dit filter.</p>
          ) : (
            weeks.map((week, i) => {
              const open = isWeekOpen(week.key, i);
              return (
                <div className="hours-week" key={week.key}>
                  <button type="button" className="hours-week-head" aria-expanded={open} onClick={() => toggleWeek(week.key, open)}>
                    <PageIcon d={ICON.chevron} strokeWidth={1.8} />
                    <span className="hours-week-title">
                      <strong>Week {week.weekNumber}</strong> <span>{weekRange(week.monday)}</span>
                    </span>
                    {week.toConfirm > 0 && <span className="hours-badge">{week.toConfirm} te bevestigen</span>}
                    <span className="hours-week-total">{formatHours(week.hours)}</span>
                  </button>
                  {open && (
                    <ul className="hours-rows">
                      {week.items.map((row) => (
                        <ShiftRow
                          key={row.id}
                          row={row}
                          expanded={expanded === row.id}
                          onToggle={() => setExpanded((id) => (id === row.id ? null : row.id))}
                          onChange={(fn) => updateRow(row.id, fn)}
                          onRemove={() => update((rows) => rows.filter((r) => r.id !== row.id))}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {panel === 'add' && <AddShiftForm onAdd={addShift} onCancel={() => setPanel(null)} />}

      <div className="hours-actions">
        <button type="button" className="hours-btn primary" disabled={totals.toConfirm === 0} onClick={confirmMonth}>
          Bevestig {totals.toConfirm}
        </button>
        <button type="button" className="hours-btn" aria-expanded={panel === 'add'} onClick={() => setPanel((p) => (p === 'add' ? null : 'add'))}>
          + Dienst
        </button>
        <button type="button" className="hours-btn" disabled={monthShifts.length === 0} onClick={exportCsv}>
          CSV
        </button>
      </div>
    </div>
  );
}

export default HoursPage;
