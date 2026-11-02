import { useEffect, useRef } from 'react';
import { useIntent } from '../hooks/useIntent';
import { useStore } from '../hooks/useStore';
import { createId } from '../lib/id';
import { KEYS } from '../lib/schema';
import './NotesPage.css';

const NOTE_COLORS = ['amber', 'teal', 'rose', 'sage'];

function NotesPage() {
  const [notes, setNotes] = useStore(KEYS.notes);
  const focusId = useRef(null);

  function addNote() {
    const id = createId();
    setNotes((prev) => [
      {
        id,
        text: '',
        color: NOTE_COLORS[prev.length % NOTE_COLORS.length],
        updatedAt: Date.now(),
      },
      ...prev,
    ]);
    return id;
  }

  // Quick action "Notitie maken": a fresh note, ready to type in.
  useIntent('notes', (type) => {
    if (type === 'new-note') focusId.current = addNote();
  });

  useEffect(() => {
    if (!focusId.current) return;
    document.querySelector(`[data-note-id="${focusId.current}"]`)?.focus();
    focusId.current = null;
  }, [notes]);

  function updateNote(id, text) {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, text, updatedAt: Date.now() } : note)),
    );
  }

  function removeNote(id) {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  }

  return (
    <div className="notes-page">
      <div className="page-header">
        <span className="page-eyebrow">Snel</span>
        <h1>Notes</h1>
      </div>

      <button type="button" className="add-note-btn" onClick={() => addNote()}>
        + Nieuwe notitie
      </button>

      {notes.length === 0 ? (
        <p className="empty-state">Nog geen notities — klik hierboven om te beginnen.</p>
      ) : (
        <div className="notes-grid">
          {notes.map((note) => (
            <div className={`note note-${note.color}`} key={note.id}>
              <textarea
                data-note-id={note.id}
                value={note.text}
                placeholder="Typ hier..."
                aria-label="Notitie"
                onChange={(e) => updateNote(note.id, e.target.value)}
              />
              <div className="note-footer">
                <span className="note-time">
                  {new Date(note.updatedAt).toLocaleDateString('nl-NL', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => removeNote(note.id)}
                  aria-label="Verwijder notitie"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotesPage;
