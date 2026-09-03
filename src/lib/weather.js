/**
 * Open-Meteo: free, keyless, CORS-enabled — the only weather API that fits a
 * static, no-backend app without asking the user to go get an API key first.
 */

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

// WMO weather codes, condensed to what the widget actually shows.
const CODES = {
  0: ['Helder', 'sun'],
  1: ['Overwegend helder', 'sun'],
  2: ['Half bewolkt', 'cloud-sun'],
  3: ['Bewolkt', 'cloud'],
  45: ['Mist', 'fog'],
  48: ['Rijp en mist', 'fog'],
  51: ['Lichte motregen', 'drizzle'],
  53: ['Motregen', 'drizzle'],
  55: ['Zware motregen', 'drizzle'],
  56: ['IJzel (licht)', 'drizzle'],
  57: ['IJzel', 'drizzle'],
  61: ['Lichte regen', 'rain'],
  63: ['Regen', 'rain'],
  65: ['Zware regen', 'rain'],
  66: ['IJzelregen (licht)', 'rain'],
  67: ['IJzelregen', 'rain'],
  71: ['Lichte sneeuw', 'snow'],
  73: ['Sneeuw', 'snow'],
  75: ['Zware sneeuw', 'snow'],
  77: ['Sneeuwkorrels', 'snow'],
  80: ['Lichte buien', 'rain'],
  81: ['Buien', 'rain'],
  82: ['Zware buien', 'rain'],
  85: ['Sneeuwbuien (licht)', 'snow'],
  86: ['Sneeuwbuien', 'snow'],
  95: ['Onweer', 'storm'],
  96: ['Onweer met hagel', 'storm'],
  99: ['Zwaar onweer met hagel', 'storm'],
};

export function describeCode(code) {
  return CODES[code] || ['Onbekend', 'cloud'];
}

export async function geocodeCity(query) {
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(query)}&count=5&language=nl&format=json`;
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error('Geen verbinding om plaatsen te zoeken.');
  }
  if (!response.ok) throw new Error('Zoeken naar plaatsen is mislukt.');
  const data = await response.json();
  return (data.results || []).map((r) => ({
    name: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
  }));
}

export async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,weather_code,wind_speed_10m',
    daily: 'temperature_2m_max,temperature_2m_min,weather_code',
    timezone: 'auto',
    forecast_days: '5',
  });

  let response;
  try {
    response = await fetch(`${FORECAST_URL}?${params}`);
  } catch {
    throw new Error('Geen verbinding met de weerdienst.');
  }
  if (!response.ok) throw new Error('Weerdienst gaf een fout terug.');

  const data = await response.json();
  if (!data.current || !data.daily) throw new Error('Onverwacht antwoord van de weerdienst.');

  return {
    current: {
      temp: Math.round(data.current.temperature_2m),
      code: data.current.weather_code,
      wind: Math.round(data.current.wind_speed_10m),
    },
    daily: data.daily.time.map((date, i) => ({
      date,
      max: Math.round(data.daily.temperature_2m_max[i]),
      min: Math.round(data.daily.temperature_2m_min[i]),
      code: data.daily.weather_code[i],
    })),
  };
}
