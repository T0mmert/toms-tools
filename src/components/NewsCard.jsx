import { useEffect, useState } from 'react';
import { formatRelativeTime } from '../lib/format';
import { fetchDutchNews } from '../lib/news';
import './NewsCard.css';

function NewsCard() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    fetchDutchNews()
      .then((data) => setItems(data))
      .catch(() => setError('Kon het nieuws niet ophalen — de nieuwsdienst is soms druk bezet.'));
  }

  // Runs once on mount. Unlike the weather widget there is no changing
  // dependency here, so nothing needs resetting before the fetch — the
  // effect body has no synchronous state update at all.
  useEffect(load, []);

  function retry() {
    setItems(null);
    setError(null);
    load();
  }

  const loading = items === null && !error;

  return (
    <section className="widget-card news-card">
      <div className="widget-head">
        <h2>Nieuws</h2>
        <a className="widget-link" href="https://nos.nl" target="_blank" rel="noopener noreferrer">
          NOS ↗
        </a>
      </div>

      {loading && <div className="widget-skeleton" />}

      {error && (
        <div className="widget-error-block">
          <p className="widget-error">{error}</p>
          <div className="widget-error-actions">
            <button type="button" className="widget-retry" onClick={retry}>
              Opnieuw proberen
            </button>
            <a href="https://nos.nl" target="_blank" rel="noopener noreferrer">
              Naar nos.nl
            </a>
          </div>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="news-list">
          {items.map((item) => (
            <li key={item.link}>
              <a href={item.link} target="_blank" rel="noopener noreferrer">
                <span className="news-title">{item.title}</span>
                {item.publishedAt && (
                  <span className="news-time">{formatRelativeTime(item.publishedAt)}</span>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default NewsCard;
