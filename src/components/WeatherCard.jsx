import { useEffect, useState } from 'react';
import { useStore } from '../hooks/useStore';
import { describeCode, fetchWeather, geocodeCity } from '../lib/weather';
import { KEYS } from '../lib/schema';
import WeatherIcon from './WeatherIcon';
import './WeatherCard.css';

const DAY_LABELS = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];

function WeatherCard() {
  const [location, setLocation] = useStore(KEYS.location);
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(!location);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchBusy, setSearchBusy] = useState(false);

  // "Loading" is derived from having neither data nor an error yet, rather
  // than tracked as its own flag — one less state update to keep in sync.
  const loading = !!location && !weather && !error;

  useEffect(() => {
    if (!location) return undefined;
    let cancelled = false;
    // Clear any previous city's result up front — without this, switching to
    // a city whose fetch then fails would keep showing the old city's
    // weather forever with no sign anything went wrong.
    setWeather(null);
    setError(null);
    fetchWeather(location.lat, location.lon)
      .then((data) => {
        if (!cancelled) setWeather(data);
      })
      .catch(() => {
        if (!cancelled) setError('Kon het weer niet ophalen. Probeer het later opnieuw.');
      });
    return () => {
      cancelled = true;
    };
  }, [location]);

  async function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearchBusy(true);
    try {
      const matches = await geocodeCity(q);
      setResults(matches);
    } catch {
      setResults([]);
    } finally {
      setSearchBusy(false);
    }
  }

  function chooseResult(place) {
    setLocation(place);
    setEditing(false);
    setResults([]);
    setQuery('');
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setSearchBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSearchBusy(false);
        chooseResult({
          name: 'Huidige locatie',
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      () => setSearchBusy(false),
      { timeout: 8000 },
    );
  }

  if (editing || !location) {
    return (
      <section className="widget-card weather-card">
        <div className="widget-head">
          <h2>Weer</h2>
        </div>
        <form className="weather-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Zoek een plaats…"
            aria-label="Zoek een plaats"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" disabled={searchBusy}>
            Zoek
          </button>
        </form>
        <button type="button" className="weather-geo" onClick={useMyLocation} disabled={searchBusy}>
          Gebruik mijn locatie
        </button>
        {results.length > 0 && (
          <ul className="weather-results">
            {results.map((r) => (
              <li key={`${r.lat}-${r.lon}`}>
                <button type="button" onClick={() => chooseResult(r)}>
                  {r.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <section className="widget-card weather-card">
      <div className="widget-head">
        <h2>Weer</h2>
        <button type="button" className="widget-link" onClick={() => setEditing(true)}>
          {location.name.split(',')[0]}
        </button>
      </div>

      {loading && <div className="widget-skeleton" />}

      {error && <p className="widget-error">{error}</p>}

      {weather && (
        <>
          <div className="weather-now">
            <WeatherIcon name={describeCode(weather.current.code)[1]} className="weather-now-icon" />
            <span className="weather-now-temp">{weather.current.temp}°</span>
            <span className="weather-now-desc">{describeCode(weather.current.code)[0]}</span>
          </div>

          <div className="weather-days">
            {weather.daily.map((day, i) => {
              const [, icon] = describeCode(day.code);
              const label = i === 0 ? 'nu' : DAY_LABELS[new Date(day.date).getDay()];
              return (
                <div className="weather-day" key={day.date}>
                  <span className="weather-day-label">{label}</span>
                  <WeatherIcon name={icon} className="weather-day-icon" />
                  <span className="weather-day-temps">
                    <strong>{day.max}°</strong> {day.min}°
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

export default WeatherCard;
