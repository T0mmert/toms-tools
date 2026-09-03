/**
 * NOS's RSS feed has no CORS headers, so a browser cannot fetch it directly.
 * rss2json is a free bridge that re-serves any RSS feed as CORS-enabled JSON —
 * the standard workaround for "read an RSS feed from a static site with no
 * backend of your own." It is third-party and rate-limited on the free tier,
 * so failures are treated as routine, not exceptional.
 */

const BRIDGE_URL = 'https://api.rss2json.com/v1/api.json';
const NOS_FEED = 'https://feeds.nos.nl/nosnieuwsalgemeen';

export async function fetchDutchNews(limit = 6) {
  const url = `${BRIDGE_URL}?rss_url=${encodeURIComponent(NOS_FEED)}`;
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error('Geen verbinding met de nieuwsdienst.');
  }
  if (!response.ok) throw new Error('Nieuwsdienst gaf een fout terug.');

  const data = await response.json();
  if (data.status !== 'ok' || !Array.isArray(data.items)) {
    throw new Error('Nieuwsdienst is momenteel niet beschikbaar.');
  }

  return data.items.slice(0, limit).map((item) => ({
    title: item.title,
    link: item.link,
    publishedAt: item.pubDate ? new Date(item.pubDate.replace(' ', 'T')).getTime() : null,
  }));
}
