import { useEffect, useMemo, useState } from 'react';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { v4 as uuid } from 'uuid';
import { useLocalStorage } from '../hooks/useLocalStorage';
import './ScrumBoard.css';

const INITIAL_BOARD = {
  cards: {},
  columnOrder: ['backlog', 'todo', 'inprogress', 'done'],
  columns: {
    backlog: { id: 'backlog', title: 'Backlog', cardIds: [] },
    todo: { id: 'todo', title: 'To Do', cardIds: [] },
    inprogress: { id: 'inprogress', title: 'In Progress', cardIds: [] },
    done: { id: 'done', title: 'Done', cardIds: [] },
  },
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const COLUMN_ACCENTS = {
  backlog: '#8f8a79',
  todo: '#f2c94c',
  inprogress: '#0d9488',
  done: '#1a7a4c',
};

const IDLE_TIMER = { cardId: null, startedAt: null };

function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}u ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, '0')}s`;
  return `${sec}s`;
}

function CardTimer({ trackedSeconds, isRunning, startedAt, onToggle }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!isRunning) return undefined;
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const liveSeconds = trackedSeconds + (isRunning && startedAt ? (Date.now() - startedAt) / 1000 : 0);

  return (
    <div className={`card-timer${isRunning ? ' running' : ''}`}>
      <button
        type="button"
        className="timer-toggle"
        onClick={onToggle}
        aria-label={isRunning ? 'Pauzeer timer' : 'Start timer'}
      >
        {isRunning ? (
          <svg viewBox="0 0 12 12" fill="currentColor">
            <rect x="2" y="1.5" width="3" height="9" rx="1" />
            <rect x="7" y="1.5" width="3" height="9" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 12 12" fill="currentColor">
            <path d="M3 1.7a.7.7 0 0 1 1.06-.6l6 4.3a.7.7 0 0 1 0 1.2l-6 4.3A.7.7 0 0 1 3 10.3z" />
          </svg>
        )}
      </button>
      <span className="timer-value">{formatDuration(liveSeconds)}</span>
    </div>
  );
}

function ScrumBoard() {
  const [board, setBoard] = useLocalStorage('toms-tools:scrum-board', INITIAL_BOARD);
  const [history, setHistory] = useLocalStorage('toms-tools:scrum-history', []);
  const [activeTimer, setActiveTimer] = useLocalStorage('toms-tools:timer', IDLE_TIMER);
  const [newCard, setNewCard] = useState({ title: '', hours: '' });

  const remainingHours = useMemo(() => {
    return board.columnOrder
      .filter((colId) => colId !== 'done')
      .reduce((sum, colId) => {
        const col = board.columns[colId];
        return sum + col.cardIds.reduce((s, cardId) => s + (board.cards[cardId]?.hours || 0), 0);
      }, 0);
  }, [board]);

  useEffect(() => {
    const today = todayISO();
    setHistory((prev) => {
      const idx = prev.findIndex((p) => p.date === today);
      if (idx === -1) return [...prev, { date: today, hours: remainingHours }];
      if (prev[idx].hours === remainingHours) return prev;
      const next = [...prev];
      next[idx] = { date: today, hours: remainingHours };
      return next;
    });
  }, [remainingHours, setHistory]);

  function handleAddCard(e) {
    e.preventDefault();
    const hours = parseFloat(newCard.hours);
    if (!newCard.title.trim() || Number.isNaN(hours) || hours < 0) return;
    const id = uuid();
    setBoard((prev) => ({
      ...prev,
      cards: { ...prev.cards, [id]: { id, title: newCard.title.trim(), hours, trackedSeconds: 0 } },
      columns: {
        ...prev.columns,
        backlog: { ...prev.columns.backlog, cardIds: [...prev.columns.backlog.cardIds, id] },
      },
    }));
    setNewCard({ title: '', hours: '' });
  }

  function commitElapsed(cardId, startedAt, now) {
    if (!cardId || !startedAt) return;
    const elapsed = (now - startedAt) / 1000;
    setBoard((prev) => ({
      ...prev,
      cards: {
        ...prev.cards,
        [cardId]: { ...prev.cards[cardId], trackedSeconds: (prev.cards[cardId]?.trackedSeconds || 0) + elapsed },
      },
    }));
  }

  function toggleTimer(cardId) {
    const now = Date.now();
    if (activeTimer.cardId === cardId) {
      commitElapsed(cardId, activeTimer.startedAt, now);
      setActiveTimer(IDLE_TIMER);
      return;
    }
    if (activeTimer.cardId) {
      commitElapsed(activeTimer.cardId, activeTimer.startedAt, now);
    }
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

  const chartData = useMemo(() => [...history].sort((a, b) => (a.date < b.date ? -1 : 1)), [history]);

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
          value={newCard.title}
          onChange={(e) => setNewCard((f) => ({ ...f, title: e.target.value }))}
          required
        />
        <input
          type="number"
          step="0.5"
          min="0"
          placeholder="Uren"
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
            const colHours = column.cardIds.reduce((s, cardId) => s + (board.cards[cardId]?.hours || 0), 0);
            return (
              <div className="column" key={column.id} style={{ '--column-accent': COLUMN_ACCENTS[column.id] }}>
                <div className="column-header">
                  <span className="column-dot" />
                  <h3>{column.title}</h3>
                  <span className="column-hours">{colHours}u</span>
                </div>
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      className={`card-list${snapshot.isDraggingOver ? ' dragging-over' : ''}`}
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
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
                                  <svg className="grip" viewBox="0 0 10 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="2.5" cy="2.5" r="1.4" fill="currentColor" />
                                    <circle cx="7.5" cy="2.5" r="1.4" fill="currentColor" />
                                    <circle cx="2.5" cy="8" r="1.4" fill="currentColor" />
                                    <circle cx="7.5" cy="8" r="1.4" fill="currentColor" />
                                    <circle cx="2.5" cy="13.5" r="1.4" fill="currentColor" />
                                    <circle cx="7.5" cy="13.5" r="1.4" fill="currentColor" />
                                  </svg>
                                </div>
                                <div className="card-footer">
                                  <span className="card-hours">{card.hours}u</span>
                                  <button
                                    type="button"
                                    className="remove-btn"
                                    onClick={() => removeCard(card.id, column.id)}
                                    aria-label="Verwijderen"
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
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <div className="backlog-graph">
        <h2>Backlog uren over tijd</h2>
        {chartData.length < 2 ? (
          <p className="empty-state">Nog niet genoeg data — kom morgen terug voor de trend.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="backlogFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d9488" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--text-dim)" tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
              <YAxis
                stroke="var(--text-dim)"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                label={{ value: 'Uren', angle: -90, position: 'insideLeft', fill: 'var(--text-dim)', fontSize: 12 }}
              />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13 }} />
              <Area type="monotone" dataKey="hours" stroke="#0d9488" strokeWidth={2.5} fill="url(#backlogFill)" dot={{ r: 3.5, fill: '#0d9488', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default ScrumBoard;
