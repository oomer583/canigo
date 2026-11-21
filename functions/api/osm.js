// Cloudflare Pages Function: GET /api/osm?lat=..&lng=..&r=60
// Runs Overpass from Cloudflare's servers, so it works even where a user's
// network cannot reach Overpass directly. Tries several public mirrors and
// caches answers for a day to stay polite to the volunteer-run servers.
const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
]

export async function onRequestGet({ request, waitUntil }) {
  const url = new URL(request.url)
  const lat = Number(url.searchParams.get('lat'))
  const lng = Number(url.searchParams.get('lng'))
  const r = Math.min(Number(url.searchParams.get('r')) || 60, 150)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  const cache = caches.default
  const key = new Request(`https://canigo-cache/osm?lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}&r=${r}`)
  const hit = await cache.match(key)
  if (hit) return hit

  // Nodes and ways only: relations pull in huge objects (city boundaries) and time out.
  const q = `[out:json][timeout:10];(node(around:${r},${lat},${lng})["name"];way(around:${r},${lat},${lng})["name"];node(around:${r},${lat},${lng})["entrance"];node(around:${r},${lat},${lng})["door"];);out center tags meta qt;`
  const tried = []
  for (const mirror of MIRRORS) {
    try {
      const res = await fetch(mirror, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(q),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'CanIGo (https://github.com/oomer583/canigo)' },
        signal: AbortSignal.timeout(12000)
      })
      if (!res.ok) {
        tried.push(`${mirror}: HTTP ${res.status}`)
        continue
      }
      const body = await res.text()
      const out = new Response(body, {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400', 'Access-Control-Allow-Origin': '*' }
      })
      waitUntil(cache.put(key, out.clone()))
      return out
    } catch (err) {
      tried.push(`${mirror}: ${err.name}`)
    }
  }
  return Response.json({ error: 'OpenStreetMap is not reachable right now', tried }, { status: 502 })
}
