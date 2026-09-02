import { useMemo, useState } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useStore } from '../hooks/useStore';
import {
  daysUntil,
  formatCurrency,
  formatRelativeDays,
  formatShortDate,
  nextOccurrence,
  todayISO,
} from '../lib/format';
import { createId } from '../lib/id';
import { KEYS } from '../lib/schema';
import './BudgetPage.css';

const CATEGORY_COLORS = [
  '#0d9488', '#f2c94c', '#b8462f', '#6b6650',
  '#7c9c8f', '#c98a4b', '#4a5a6b', '#9b6b8e',
];

const EMPTY_FORM = { type: 'expense', category: '', description: '', amount: '' };
const EMPTY_RECURRING = { name: '', amount: '', day: '' };

function BudgetPage() {
  const [entries, setEntries] = useStore(KEYS.budget);
  const [recurring, setRecurring] = useStore(KEYS.recurring);
  const [form, setForm] = useState(EMPTY_FORM);
  const [recurringForm, setRecurringForm] = useState(EMPTY_RECURRING);

  const totals = useMemo(() => {
    const income = entries.filter((e) => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const expenses = entries.filter((e) => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [entries]);

  const categoryData = useMemo(() => {
    const map = new Map();
    entries
      .filter((e) => e.type === 'expense')
      .forEach((e) => map.set(e.category, (map.get(e.category) || 0) + e.amount));
    return [...map]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [entries]);

  const upcoming = useMemo(
    () => recurring.map((r) => ({ ...r, next: nextOccurrence(r.day) })).sort((a, b) => a.next - b.next),
    [recurring],
  );

  const recurringMonthly = useMemo(
    () => recurring.reduce((sum, r) => sum + r.amount, 0),
    [recurring],
  );

  function handleSubmit(e) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    const description = form.description.trim();
    if (!description || !Number.isFinite(amount) || amount <= 0) return;

    setEntries((prev) => [
      ...prev,
      {
        id: createId(),
        type: form.type,
        category: form.category.trim() || 'Overig',
        description,
        amount,
        date: todayISO(),
      },
    ]);
    setForm(EMPTY_FORM);
  }

  function removeEntry(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function handleAddRecurring(e) {
    e.preventDefault();
    const amount = parseFloat(recurringForm.amount);
    const day = parseInt(recurringForm.day, 10);
    const name = recurringForm.name.trim();
    if (!name || !Number.isFinite(amount) || amount <= 0) return;
    if (!Number.isInteger(day) || day < 1 || day > 31) return;

    setRecurring((prev) => [...prev, { id: createId(), name, amount, day }]);
    setRecurringForm(EMPTY_RECURRING);
  }

  function removeRecurring(id) {
    setRecurring((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="budget-page">
      <div className="page-header">
        <span className="page-eyebrow">Overzicht</span>
        <h1>Budget</h1>
      </div>

      <div className="budget-summary">
        <div className="summary-card income">
          <span className="summary-label">Inkomsten</span>
          <span className="summary-value">{formatCurrency(totals.income)}</span>
        </div>
        <div className="summary-card expense">
          <span className="summary-label">Uitgaven</span>
          <span className="summary-value">{formatCurrency(totals.expenses)}</span>
        </div>
        <div className={`summary-card balance ${totals.balance < 0 ? 'negative' : 'positive'}`}>
          <span className="summary-label">Saldo</span>
          <span className="summary-value">{formatCurrency(totals.balance)}</span>
        </div>
      </div>

      <div className="budget-body">
        <div className="budget-left">
          <form className="entry-form" onSubmit={handleSubmit}>
            <h2>Nieuwe post</h2>
            <div className="form-row type-toggle">
              <label className={form.type === 'income' ? 'active' : ''}>
                <input
                  type="radio"
                  name="type"
                  checked={form.type === 'income'}
                  onChange={() => setForm((f) => ({ ...f, type: 'income' }))}
                />
                Inkomsten
              </label>
              <label className={form.type === 'expense' ? 'active' : ''}>
                <input
                  type="radio"
                  name="type"
                  checked={form.type === 'expense'}
                  onChange={() => setForm((f) => ({ ...f, type: 'expense' }))}
                />
                Uitgave
              </label>
            </div>
            <input
              type="text"
              placeholder="Omschrijving"
              aria-label="Omschrijving"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              required
            />
            <input
              type="text"
              placeholder="Categorie (optioneel)"
              aria-label="Categorie"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Bedrag"
              aria-label="Bedrag in euro"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              required
            />
            <button type="submit">Toevoegen</button>
          </form>

          {categoryData.length > 0 && (
            <div className="category-chart">
              <h2>Uitgaven per categorie</h2>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {categoryData.map((entry, i) => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      fontSize: 13,
                      color: 'var(--ink)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="entry-list">
          <h2>Boekingen</h2>
          {entries.length === 0 ? (
            <p className="empty-state">Nog geen boekingen toegevoegd.</p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Datum</th>
                    <th scope="col">Omschrijving</th>
                    <th scope="col">Categorie</th>
                    <th scope="col">Bedrag</th>
                    <th scope="col"><span className="sr-only">Acties</span></th>
                  </tr>
                </thead>
                <tbody>
                  {[...entries].reverse().map((entry) => (
                    <tr key={entry.id} className={entry.type}>
                      <td>{entry.date ? formatShortDate(entry.date) : '—'}</td>
                      <td>{entry.description}</td>
                      <td>{entry.category}</td>
                      <td className="amount">
                        {entry.type === 'income' ? '+' : '−'}
                        {formatCurrency(entry.amount)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="remove-btn"
                          onClick={() => removeEntry(entry.id)}
                          aria-label={`Verwijder ${entry.description}`}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="recurring-panel">
        <div className="recurring-head">
          <h2>Terugkerende kosten</h2>
          {recurring.length > 0 && (
            <span className="recurring-total">{formatCurrency(recurringMonthly)} per maand</span>
          )}
        </div>

        <form className="recurring-form" onSubmit={handleAddRecurring}>
          <input
            type="text"
            placeholder="Naam (bijv. Netflix)"
            aria-label="Naam van de terugkerende kost"
            value={recurringForm.name}
            onChange={(e) => setRecurringForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Bedrag"
            aria-label="Bedrag per maand"
            value={recurringForm.amount}
            onChange={(e) => setRecurringForm((f) => ({ ...f, amount: e.target.value }))}
            required
          />
          <input
            type="number"
            min="1"
            max="31"
            placeholder="Dag v/d maand"
            aria-label="Dag van de maand"
            value={recurringForm.day}
            onChange={(e) => setRecurringForm((f) => ({ ...f, day: e.target.value }))}
            required
          />
          <button type="submit">Toevoegen</button>
        </form>

        {upcoming.length === 0 ? (
          <p className="empty-state">
            Nog geen terugkerende kosten. Handig voor abonnementen en vaste lasten.
          </p>
        ) : (
          <ul className="recurring-list">
            {upcoming.map((item) => {
              const days = daysUntil(item.next);
              return (
                <li key={item.id}>
                  <span className="recurring-name">{item.name}</span>
                  <span className={`recurring-due${days <= 3 ? ' soon' : ''}`}>
                    {formatRelativeDays(days)}
                  </span>
                  <span className="recurring-amount">{formatCurrency(item.amount)}</span>
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeRecurring(item.id)}
                    aria-label={`Verwijder ${item.name}`}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default BudgetPage;
