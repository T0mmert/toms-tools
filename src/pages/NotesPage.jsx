import { v4 as uuid } from 'uuid';
import { useLocalStorage } from '../hooks/useLocalStorage';
import './NotesPage.css';

const NOTE_COLORS = ['amber', 'teal', 'rose', 'sage'];

function NotesPage() {
  const [notes, setNotes] = useLocalStorage('toms-tools:notes', []);

  function addNote() {
    const id = uuid();
    setNotes((prev) => [
      { id, text: '', color: NOTE_COLORS[prev.length % NOTE_COLORS.length], updatedAt: Date.now() },
      ...prev,
    ]);
  }

  function updateNote(id, text) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text, updatedAt: Date.now() } : n)));
  }

  function removeNote(id) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div className="notes-page">
      <div className="page-header">
        <span className="page-eyebrow">Snel</span>
        <h1>Notes</h1>
      </div>

      <button type="button" className="add-note-btn" onClick={addNote}>
        + Nieuwe notitie
      </button>

      {notes.length === 0 ? (
        <p className="empty-state">Nog geen notities — klik hierboven om te beginnen.</p>
      ) : (
        <div className="notes-grid">
          {notes.map((note) => (
            <div className={`note note-${note.color}`} key={note.id}>
              <textarea
                value={note.text}
                placeholder="Typ hier..."
                onChange={(e) => updateNote(note.id, e.target.value)}
              />
              <div className="note-footer">
                <span className="note-time">
                  {new Date(note.updatedAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                </span>
                <button type="button" className="remove-btn" onClick={() => removeNote(note.id)} aria-label="Verwijderen">
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
