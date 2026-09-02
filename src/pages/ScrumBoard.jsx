import { useEffect, useMemo, useState } from 'react';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import TimeReport from '../components/TimeReport';
import { useStore } from '../hooks/useStore';
import { COLUMN_ACCENTS, columnHours, remainingHours } from '../lib/board';
import { formatDuration, formatShortDate, todayISO } from '../lib/format';
import { createId } from '../lib/id';
import { KEYS } from '../lib/schema';
import './ScrumBoard.css';

const IDLE_TIMER = { cardId: null, startedAt: null };

function CardTimer({ trackedSeconds, isRunning, startedAt, onToggle }) {
  // Time-of-day lives in state rather than being read during render, so the
  // component stays pure and only re-renders on each tick.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isRunning) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const elapsed = isRunning && startedAt ? Math.max(0, (now - startedAt) / 1000) : 0;
  const liveSeconds = trackedSeconds + elapsed;

  return (
    <div className={`card-timer${isRunning ? ' running' : ''}`}>
      <button
        type="button"
        className="timer-toggle"
        onClick={onToggle}
        aria-label={isRunning ? 'Pauzeer timer' : 'Start timer'}
      >
        {isRunning ? (
          <svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <rect x="2" y="1.5" width="3" height="9" rx="1" />
            <rect x="7" y="1.5" width="3" height="9" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <path d="M3 1.7a.7.7 0 0 1 1.06-.6l6 4.3a.7.7 0 0 1 0 1.2l-6 4.3A.7.7 0 0 1 3 10.3z" />
          </svg>
        )}
      </button>
      <span className="timer-value">{formatDuration(liveSeconds)}</span>
      {isRunning && <span className="timer-pulse" aria-hidden="true" />}
    </div>
  );
}

function ScrumBoard() {
  const [board, setBoard] = useStore(KEYS.board);
  const [history, setHistory] = useStore(KEYS.history);
  const [activeTimer, setActiveTimer] = useStore(KEYS.timer);
  const [sessions, setSessions] = useStore(KEYS.sessions);
  const [newCard, setNewCard] = useState({ title: '', hours: '' });

  const outstanding = useMemo(() => remainingHours(board), [board]);
  const cardCount = Object.keys(board.cards).length;

  // Record one backlog datapoint per day so the trend reflects real change.
  // Skipped while the board is empty, otherwise a fresh install would plot a
  // meaningless run of zeroes.
  useEffect(() => {
    if (cardCount === 0) return;
    const today = todayISO();
    setHistory((prev) => {
      const idx = prev.findIndex((p) => p.date === today);
      if (idx === -1) return [...prev, { date: today, hours: outstanding }];
      if (prev[idx].hours === outstanding) return prev;
      const next = [...prev];
      next[idx] = { date: today, hours: outstanding };
      return next;
    });
  }, [outstanding, cardCount, setHistory]);

  function handleAddCard(e) {
    e.preventDefault();
    const title = newCard.title.trim();
    const hours = parseFloat(newCard.hours);
    if (!title || !Number.isFinite(hours) || hours < 0) return;

    const id = createId();
    setBoard((prev) => ({
      ...prev,
      cards: { ...prev.cards, [id]: { id, title, hours, trackedSeconds: 0 } },
      columns: {
        ...prev.columns,
        backlog: { ...prev.columns.backlog, cardIds: [...prev.columns.backlog.cardIds, id] },
      },
    }));
    setNewCard({ title: '', hours: '' });
  }

  function commitElapsed(cardId, startedAt, now) {
    if (!cardId || !startedAt) return;
    const elapsed = Math.max(0, (now - startedAt) / 1000);
    setBoard((prev) => {
      const card = prev.cards[cardId];
      // The card may be gone (deleted here, or removed in another tab). Without
      // this guard the spread below would write a titleless ghost card whose
      // tracked time then counts towards every total, forever.
      if (!card) return prev;
      return {
        ...prev,
        cards: {
          ...prev.cards,
          [cardId]: { ...card, trackedSeconds: (card.trackedSeconds || 0) + elapsed },
        },
      };
    });

    // Log the run itself so time can be reported per day, not just as a
    // running total. Sub-second blips are noise, so they are not recorded.
    if (elapsed < 1) return;
    const card = board.cards[cardId];
    if (!card) return;
    setSessions((prev) => [
      ...prev,
      {
        id: createId(),
        cardId,
        title: card.title,
        date: todayISO(),
        seconds: Math.round(elapsed),
      },
    ]);
  }

  function toggleTimer(cardId) {
    const now = Date.now();
    if (activeTimer.cardId === cardId) {
      commitElapsed(cardId, activeTimer.startedAt, now);
      setActiveTimer(IDLE_TIMER);
      return;
    }
    if (activeTimer.cardId) commitElapsed(activeTimer.cardId, activeTimer.startedAt, now);
    setActiveTimer({ cardId, startedAt: now });
  }

  function removeCard(cardId, columnId) {
    setActiveTimer((prev) => (prev.cardId === cardId ? IDLE_TIMER : prev));
    setBoard((prev) => {
      const nextCards = { ...prev.cards };
      delete nextCards[cardId];
      return {
        ...prev,
        cards: nextCards,
        columns: {
          ...prev.columns,
          [columnId]: {
            ...prev.columns[columnId],
            cardIds: prev.columns[columnId].cardIds.filter((id) => id !== cardId),
          },
        },
      };
    });
  }

  function onDragEnd(result) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    setBoard((prev) => {
      const sourceCol = prev.columns[source.droppableId];
      const destCol = prev.columns[destination.droppableId];
      if (!sourceCol || !destCol) return prev;

      const sourceCardIds = Array.from(sourceCol.cardIds);
      sourceCardIds.splice(source.index, 1);

      if (sourceCol.id === destCol.id) {
        sourceCardIds.splice(destination.index, 0, draggableId);
        return { ...prev, columns: { ...prev.columns, [sourceCol.id]: { ...sourceCol, cardIds: sourceCardIds } } };
      }

      const destCardIds = Array.from(destCol.cardIds);
      destCardIds.splice(destination.index, 0, draggableId);
      return {
        ...prev,
        columns: {
          ...prev.columns,
          [sourceCol.id]: { ...sourceCol, cardIds: sourceCardIds },
          [destCol.id]: { ...destCol, cardIds: destCardIds },
        },
      };
    });
  }

  const chartData = useMemo(
    () => history.map((point) => ({ ...point, label: formatShortDate(point.date) })),
    [history],
  );

  return (
    <div className="scrum-page">
      <div className="page-header">
        <span className="page-eyebrow">Sprint</span>
        <h1>Scrum Board</h1>
      </div>

      <form className="add-card-form" onSubmit={handleAddCard}>
        <input
          type="text"
          placeholder="Nieuwe taak"
          aria-label="Taakomschrijving"
          value={newCard.title}
          onChange={(e) => setNewCard((f) => ({ ...f, title: e.target.value }))}
          required
        />
        <input
          type="number"
          step="0.5"
          min="0"
          placeholder="Uren"
          aria-label="Geschatte uren"
          value={newCard.hours}
          onChange={(e) => setNewCard((f) => ({ ...f, hours: e.target.value }))}
          required
        />
        <button type="submit">Toevoegen aan Backlog</button>
      </form>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="board">
          {board.columnOrder.map((colId) => {
            const column = board.columns[colId];
            const hours = columnHours(board, colId);
            return (
              <section className="column" key={column.id} style={{ '--column-accent': COLUMN_ACCENTS[column.id] }}>
                <div className="column-header">
                  <span className="column-dot" aria-hidden="true" />
                  <h3>{column.title}</h3>
                  <span className="column-hours">{hours}u</span>
                </div>
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      className={`card-list${snapshot.isDraggingOver ? ' dragging-over' : ''}`}
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {column.cardIds.length === 0 && !snapshot.isDraggingOver && (
                        <p className="column-empty">Sleep hier een kaart naartoe</p>
                      )}
                      {column.cardIds.map((cardId, index) => {
                        const card = board.cards[cardId];
                        if (!card) return null;
                        return (
                          <Draggable draggableId={card.id} index={index} key={card.id}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                className={`card${dragSnapshot.isDragging ? ' dragging' : ''}`}
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                              >
                                <div className="card-top">
                                  <span className="card-title">{card.title}</span>
                                  <svg className="grip" viewBox="0 0 10 16" fill="none" aria-hidden="true">
                                    <circle cx="2.5" cy="2.5" r="1.4" fill="currentColor" />
                                    <circle cx="7.5" cy="2.5" r="1.4" fill="currentColor" />
                                    <circle cx="2.5" cy="8" r="1.4" fill="currentColor" />
                                    <circle cx="7.5" cy="8" r="1.4" fill="currentColor" />
                                    <circle cx="2.5" cy="13.5" r="1.4" fill="currentColor" />
                                    <circle cx="7.5" cy="13.5" r="1.4" fill="currentColor" />
                                  </svg>
                                </div>
                                <div className="card-footer">
                                  <span className="card-hours">{card.hours}u geschat</span>
                                  <button
                                    type="button"
                                    className="remove-btn"
                                    onClick={() => removeCard(card.id, column.id)}
                                    aria-label={`Verwijder ${card.title}`}
                                  >
                                    ×
                                  </button>
                                </div>
                                <CardTimer
                                  trackedSeconds={card.trackedSeconds || 0}
                                  isRunning={activeTimer.cardId === card.id}
                                  startedAt={activeTimer.cardId === card.id ? activeTimer.startedAt : null}
                                  onToggle={() => toggleTimer(card.id)}
                                />
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </section>
            );
          })}
        </div>
      </DragDropContext>

      <div className="backlog-graph">
        <h2>Backlog uren over tijd</h2>
        {chartData.length < 2 ? (
          <p className="empty-state">
            Nog niet genoeg data — de trend verschijnt zodra je op een tweede dag werkt aan het bord.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="backlogFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d9488" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
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
                width={44}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(value) => [`${value}u`, 'Openstaand']}
                contentStyle={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  fontSize: 13,
                  color: 'var(--ink)',
                }}
              />
              <Area
                type="monotone"
                dataKey="hours"
                stroke="#0d9488"
                strokeWidth={2.5}
                fill="url(#backlogFill)"
                dot={{ r: 3.5, fill: '#0d9488', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <TimeReport board={board} sessions={sessions} />
    </div>
  );
}

export default ScrumBoard;
