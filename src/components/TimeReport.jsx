import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { addDays, formatDuration, toLocalISO } from '../lib/format';

const DAY_LABELS = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];

function TimeReport({ board, sessions }) {
  const perDay = useMemo(() => {
    const totals = new Map();
    sessions.forEach((s) => totals.set(s.date, (totals.get(s.date) || 0) + s.seconds));

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDays(new Date(), -i);
      const date = toLocalISO(d);
      days.push({
        date,
        label: DAY_LABELS[d.getDay()],
        hours: Math.round(((totals.get(date) || 0) / 3600) * 100) / 100,
      });
    }
    return days;
  }, [sessions]);

  const weekTotal = perDay.reduce((sum, d) => sum + d.hours, 0);

  // Estimate against actual, worst overrun first — that is the row worth
  // looking at when planning the next sprint.
  const comparison = useMemo(() => {
    return Object.values(board.cards)
      .filter((card) => (card.trackedSeconds || 0) > 0)
      .map((card) => {
        const actual = (card.trackedSeconds || 0) / 3600;
        return {
          id: card.id,
          title: card.title,
          estimate: card.hours,
          actual,
          ratio: card.hours > 0 ? actual / card.hours : null,
        };
      })
      .sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0))
      .slice(0, 6);
  }, [board]);

  const hasData = weekTotal > 0 || comparison.length > 0;

  return (
    <div className="time-report">
      <div className="report-head">
        <h2>Tijdrapport</h2>
        {weekTotal > 0 && (
          <span className="report-total">{formatDuration(weekTotal * 3600)} deze week</span>
        )}
      </div>

      {!hasData ? (
        <p className="empty-state">
          Nog geen tijd bijgehouden. Start een timer op een kaart om hier een overzicht te krijgen.
        </p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={perDay} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="var(--text-dim)"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
              />
              <YAxis
                stroke="var(--text-dim)"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                formatter={(value) => [`${value}u`, 'Bijgehouden']}
                contentStyle={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  fontSize: 13,
                  color: 'var(--ink)',
                }}
              />
              <Bar dataKey="hours" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {comparison.length > 0 && (
            <div className="estimate-table">
              <h3>Schatting vs werkelijk</h3>
              <ul>
                {comparison.map((row) => {
                  const over = row.ratio !== null && row.ratio > 1;
                  const width = Math.min(100, row.ratio === null ? 100 : row.ratio * 100);
                  return (
                    <li key={row.id}>
                      <span className="estimate-name">{row.title}</span>
                      <span className="estimate-bar">
                        <span
                          className={`estimate-fill${over ? ' over' : ''}`}
                          style={{ width: `${width}%` }}
                        />
                      </span>
                      <span className={`estimate-figures${over ? ' over' : ''}`}>
                        {row.actual.toFixed(1)}u / {row.estimate}u
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default TimeReport;
