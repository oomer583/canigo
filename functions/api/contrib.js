// Cloudflare Pages Function: volunteer entrance reports, stored in D1 (binding DB).
// GET  /api/contrib?lat=..&lng=..          reports within ~60 m
// POST /api/contrib  {name, lat, lng, steps, ramp, doorCm}
// POST /api/contrib  {report: id}          "This is wrong" (3 reports hide an entry)
// No accounts, no free text beyond the place name, no IP addresses stored.

const MAX_PER_HOUR = 10

export function validate(body) {
  const name = typeof body?.name === 'string' ? body.name.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 120) : ''
  const lat = Number(body?.lat)
  const lng = Number(body?.lng)
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { error: 'name, lat and lng are required' }
  let steps = body.steps
  steps = steps === null || steps === undefined || steps === '' ? null : Number(steps)
  if (steps !== null && (!Number.isInteger(steps) || steps < 0 || steps > 30)) return { error: 'steps must be 0 to 30' }
  const ramp = ['yes', 'no', 'unknown'].includes(body.ramp) ? body.ramp : 'unknown'
  let doorCm = body.doorCm
  doorCm = doorCm === null || doorCm === undefined || doorCm === '' ? null : Math.round(Number(doorCm))
  if (doorCm !== null && (!Number.isFinite(doorCm) || doorCm < 40 || doorCm > 300)) return { error: 'door width must be 40 to 300 cm' }
  if (steps === null && ramp === 'unknown' && doorCm === null) return { error: 'tell us at least one thing about the entrance' }
  return { value: { name, lat: +lat.toFixed(6), lng: +lng.toFixed(6), steps, ramp, doorCm } }
}

// Counts requests per visitor per hour in the edge cache; the address itself is only hashed, never stored.
async function tooMany(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  const hour = new Date().toISOString().slice(0, 13)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${ip}|${hour}`))
  const id = [...new Uint8Array(digest)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('')
  const key = new Request(`https://canigo-rate/${id}`)
  const cache = caches.default
  const hit = await cache.match(key)
  const count = hit ? Number(await hit.text()) : 0
  if (count >= MAX_PER_HOUR) return true
  await cache.put(key, new Response(String(count + 1), { headers: { 'Cache-Control': 'max-age=3600' } }))
  return false
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return Response.json({ error: 'not-configured' }, { status: 503 })
  const url = new URL(request.url)
  const lat = Number(url.searchParams.get('lat'))
  const lng = Number(url.searchParams.get('lng'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return Response.json({ error: 'lat and lng are required' }, { status: 400 })
  const dLat = 0.0006
  const dLng = 0.0006 / Math.max(0.2, Math.cos((lat * Math.PI) / 180))
  const { results } = await env.DB.prepare(
    'SELECT id, name, lat, lng, steps, ramp, door_cm AS doorCm, created_at AS createdAt FROM contributions WHERE hidden = 0 AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ? ORDER BY created_at DESC LIMIT 50'
  ).bind(lat - dLat, lat + dLat, lng - dLng, lng + dLng).all()
  return Response.json({ results }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return Response.json({ error: 'not-configured' }, { status: 503 })
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid JSON' }, { status: 400 })
  }
  if (await tooMany(request)) return Response.json({ error: 'Too many reports from you this hour. Please try later.' }, { status: 429 })

  if (body?.report != null) {
    const id = Number(body.report)
    if (!Number.isInteger(id)) return Response.json({ error: 'bad id' }, { status: 400 })
    await env.DB.prepare('UPDATE contributions SET reports = reports + 1, hidden = CASE WHEN reports + 1 >= 3 THEN 1 ELSE hidden END WHERE id = ?').bind(id).run()
    return Response.json({ ok: true })
  }

  const { value, error } = validate(body)
  if (error) return Response.json({ error }, { status: 400 })
  const createdAt = new Date().toISOString()
  const res = await env.DB.prepare('INSERT INTO contributions (name, lat, lng, steps, ramp, door_cm, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(value.name, value.lat, value.lng, value.steps, value.ramp, value.doorCm, createdAt)
    .run()
  return Response.json({ ok: true, id: res.meta?.last_row_id ?? null, createdAt, ...value }, { status: 201 })
}
