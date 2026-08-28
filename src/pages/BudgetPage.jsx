import { useMemo, useState } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { v4 as uuid } from 'uuid';
import { useLocalStorage } from '../hooks/useLocalStorage';
import './BudgetPage.css';

const CATEGORY_COLORS = [
  '#0d9488', '#f2c94c', '#b8462f', '#6b6650',
  '#7c9c8f', '#c98a4b', '#4a5a6b', '#9b6b8e',
];

const EMPTY_FORM = { type: 'expense', category: '', description: '', amount: '' };

const currency = (n) => n.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' });

function BudgetPage() {
  const [entries, setEntries] = useLocalStorage('toms-tools:budget', []);
  const [form, setForm] = useState(EMPTY_FORM);

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
    </div>
  );
}

export default BudgetPage;
