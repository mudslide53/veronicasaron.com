// Pulls Veronica's favorite and currently-reading books live from her public Goodreads profile.
const PROFILE = 'https://www.goodreads.com/user/show/119872802-veronica';

function parse(html) {
  const books = [];
  const re = /<a[^>]+href="(\/book\/show\/[^"]+)"[^>]*>\s*<img([^>]+)>/g;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[2];
    const alt = (attrs.match(/alt="([^"]+)"/) || [])[1];
    const src = (attrs.match(/src="([^"]+)"/) || [])[1];
    if (!alt || !src || !/ by /.test(alt)) continue;
    const [title, author] = alt.split(/ by (?=[^]*$)/);
    books.push({ title: decode(title), author: decode(author || ''), url: 'https://www.goodreads.com' + m[1], cover: src.replace(/\._S[XY]\d+_/, '._SY300_'), at: m.index });
  }
  const cut = html.search(/is Currently Reading/i);
  const seen = new Set();
  const uniq = list => list.filter(b => !seen.has(b.url) && seen.add(b.url)).map(({ at, ...b }) => b);
  return {
    favorites: uniq(books.filter(b => cut < 0 || b.at < cut)).slice(0, 12),
    reading: uniq(books.filter(b => cut >= 0 && b.at > cut)).slice(0, 6),
  };
}
const decode = s => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

export async function onRequestGet({ request }) {
  const cache = caches.default;
  const key = new Request(new URL('/api/books', request.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;
  try {
    const r = await fetch(PROFILE, { headers: { 'user-agent': 'Mozilla/5.0 (veronicasaron.com bookshelf)', accept: 'text/html' } });
    if (!r.ok) throw new Error('goodreads ' + r.status);
    const data = { source: PROFILE, fetched: new Date().toISOString(), ...parse(await r.text()) };
    if (!data.favorites.length) throw new Error('no books parsed');
    const res = new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=21600' } });
    await cache.put(key, res.clone());
    return res;
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 502, headers: { 'content-type': 'application/json' } });
  }
}
