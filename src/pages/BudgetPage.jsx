import { useMemo, useState } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { v4 as uuid } from 'uuid';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { formatCurrency as currency, nextOccurrence } from '../lib/format';
import './BudgetPage.css';

const CATEGORY_COLORS = [
  '#0d9488', '#f2c94c', '#b8462f', '#6b6650',
  '#7c9c8f', '#c98a4b', '#4a5a6b', '#9b6b8e',
];

const EMPTY_FORM = { type: 'expense', category: '', description: '', amount: '' };
const EMPTY_RECURRING_FORM = { name: '', amount: '', day: '' };

function daysUntil(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date - today) / 86400000);
}

function BudgetPage() {
  const [entries, setEntries] = useLocalStorage('toms-tools:budget', []);
  const [recurring, setRecurring] = useLocalStorage('toms-tools:recurring', []);
  const [form, setForm] = useState(EMPTY_FORM);
  const [recurringForm, setRecurringForm] = useState(EMPTY_RECURRING_FORM);

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
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [entries]);

  function handleSubmit(e) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.description.trim() || Number.isNaN(amount) || amount <= 0) return;
    setEntries((prev) => [
      ...prev,
      {
        id: uuid(),
        type: form.type,
        category: form.category.trim() || 'Overig',
        description: form.description.trim(),
        amount,
        date: new Date().toISOString().slice(0, 10),
      },
    ]);
    setForm(EMPTY_FORM);
  }

  function removeEntry(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const upcomingRecurring = useMemo(() => {
    return recurring
      .map((r) => ({ ...r, next: nextOccurrence(r.day) }))
      .sort((a, b) => a.next - b.next);
  }, [recurring]);

  function handleAddRecurring(e) {
    e.preventDefault();
    const amount = parseFloat(recurringForm.amount);
    const day = parseInt(recurringForm.day, 10);
    if (!recurringForm.name.trim() || Number.isNaN(amount) || amount <= 0) return;
    if (Number.isNaN(day) || day < 1 || day > 31) return;
    setRecurring((prev) => [...prev, { id: uuid(), name: recurringForm.name.trim(), amount, day }]);
    setRecurringForm(EMPTY_RECURRING_FORM);
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
          <span className="summary-value">{currency(totals.income)}</span>
        </div>
        <div className="summary-card expense">
          <span className="summary-label">Uitgaven</span>
          <span className="summary-value">{currency(totals.expenses)}</span>
        </div>
        <div className={`summary-card balance ${totals.balance < 0 ? 'negative' : 'positive'}`}>
          <span className="summary-label">Saldo</span>
          <span className="summary-value">{currency(totals.balance)}</span>
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
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              required
            />
            <input
              type="text"
              placeholder="Categorie (optioneel)"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Bedrag"
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
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {categoryData.map((entry, i) => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => currency(value)} />
                  <Legend />
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
            <table>
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Omschrijving</th>
                  <th>Categorie</th>
                  <th>Bedrag</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {[...entries].reverse().map((entry) => (
                  <tr key={entry.id} className={entry.type}>
                    <td>{entry.date}</td>
                    <td>{entry.description}</td>
                    <td>{entry.category}</td>
                    <td className="amount">
                      {entry.type === 'income' ? '+' : '-'}
                      {currency(entry.amount)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removeEntry(entry.id)}
                        aria-label="Verwijderen"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="recurring-panel">
        <h2>Terugkerende kosten</h2>
        <form className="recurring-form" onSubmit={handleAddRecurring}>
          <input
            type="text"
            placeholder="Naam (bijv. Netflix)"
            value={recurringForm.name}
            onChange={(e) => setRecurringForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Bedrag"
            value={recurringForm.amount}
            onChange={(e) => setRecurringForm((f) => ({ ...f, amount: e.target.value }))}
            required
          />
          <input
            type="number"
            min="1"
            max="31"
            placeholder="Dag v/d maand"
            value={recurringForm.day}
            onChange={(e) => setRecurringForm((f) => ({ ...f, day: e.target.value }))}
            required
          />
          <button type="submit">Toevoegen</button>
        </form>

        {upcomingRecurring.length === 0 ? (
          <p className="empty-state">Nog geen terugkerende kosten toegevoegd.</p>
        ) : (
          <ul className="recurring-list">
            {upcomingRecurring.map((r) => {
              const days = daysUntil(r.next);
              return (
                <li key={r.id}>
                  <span className="recurring-name">{r.name}</span>
                  <span className="recurring-due">
                    {days === 0 ? 'Vandaag' : days === 1 ? 'Morgen' : `Over ${days} dagen`}
                  </span>
                  <span className="recurring-amount">{currency(r.amount)}</span>
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeRecurring(r.id)}
                    aria-label="Verwijderen"
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
