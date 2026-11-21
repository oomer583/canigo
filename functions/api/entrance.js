// Cloudflare Pages Function: GET /api/entrance?lat=..&lng=..
// 1. Finds Mapillary street-level photos taken near the place and facing it.
// 2. Asks a vision model (Workers AI) whether the entrance shows steps or a ramp.
// The Mapillary token stays on the server (secret MAPILLARY_TOKEN).
// Photos: Mapillary, CC BY-SA 4.0. Answers are cached for a week.

// Vision models on Workers AI, tried in order. Models get retired; keep a fallback.
// Llama 4 Scout answers reliably; Gemma 4 returned nothing in tests, so it is only a fallback.
const MODELS = ['@cf/meta/llama-4-scout-17b-16e-instruct', '@cf/google/gemma-4-26b-a4b-it']
const PROMPT =
  'This is a street photo near a building. First decide if a building entrance door is clearly visible. ' +
  'Answer in exactly four lines:\n' +
  'DOOR: yes or no (is an entrance door clearly visible?)\n' +
  'STEPS: yes, no, or unclear (are there steps up to that door?)\n' +
  'RAMP: yes, no, or unclear (is there a ramp to that door?)\n' +
  'NOTE: one short sentence describing the entrance.\n' +
  'Rules: if DOOR is no, answer unclear for STEPS and RAMP. If the door is level with the pavement and you see no step, answer STEPS: no. ' +
  'The NOTE must agree with the other lines. Do not guess what you cannot see.'

function bearing(from, to) {
  const toRad = (d) => (d * Math.PI) / 180
  const y = Math.sin(toRad(to.lng - from.lng)) * Math.cos(toRad(to.lat))
  const x = Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) - Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(toRad(to.lng - from.lng))
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

function meters(a, b) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const h = Math.sin(toRad(b.lat - a.lat) / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(toRad(b.lng - a.lng) / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function angleGap(a, b) {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

export function parseAnswer(text = '') {
  const pick = (key) => {
    const m = text.match(new RegExp(`${key}\\s*:\\s*(yes|no|unclear)`, 'i'))
    return m ? m[1].toLowerCase() : 'unclear'
  }
  const note = (text.match(/NOTE\s*:\s*(.+)/i) || [])[1]?.trim() || null
  const doorMatch = text.match(/DOOR\s*:\s*(yes|no)/i)
  const door = doorMatch ? doorMatch[1].toLowerCase() : 'unclear'
  // No visible door: whatever the model said about steps is a guess.
  if (door === 'no') return { door, steps: 'unclear', ramp: 'unclear', note }
  return { door, steps: pick('STEPS'), ramp: pick('RAMP'), note }
}

function toBase64(bytes) {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

function textOf(out) {
  if (!out) return ''
  if (typeof out.response === 'string') return out.response
  if (out.choices?.[0]?.message?.content) return out.choices[0].message.content
  return out.description || ''
}

async function readEntrance(env, bytes) {
  const dataUrl = `data:image/jpeg;base64,${toBase64(bytes)}`
  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: PROMPT },
        { type: 'image_url', image_url: { url: dataUrl } }
      ]
    }
  ]
  let lastError = null
  for (const model of MODELS) {
    try {
      const out = await env.AI.run(model, { messages, max_tokens: 180 })
      const text = textOf(out)
      if (text) return { ...parseAnswer(text), model }
    } catch (err) {
      lastError = err
    }
  }
  return { error: lastError?.message || 'no model answered' }
}

export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url)
  const place = { lat: Number(url.searchParams.get('lat')), lng: Number(url.searchParams.get('lng')) }
  if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return Response.json({ error: 'lat and lng are required' }, { status: 400 })
  if (!env.MAPILLARY_TOKEN) return Response.json({ error: 'not-configured' }, { status: 503 })

  const cache = caches.default
  const key = new Request(`https://canigo-cache/entrance/v4?lat=${place.lat.toFixed(5)}&lng=${place.lng.toFixed(5)}`)
  const hit = await cache.match(key)
  if (hit) return hit

  // Place points are often the middle of the building, so search ~80 m around it.
  const d = 0.0008
  const bbox = [place.lng - d, place.lat - d, place.lng + d, place.lat + d].join(',')
  const api = `https://graph.mapillary.com/images?access_token=${env.MAPILLARY_TOKEN}&fields=id,thumb_1024_url,captured_at,compass_angle,computed_compass_angle,geometry,computed_geometry,is_pano,creator&bbox=${bbox}&limit=200`
  const res = await fetch(api, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) return Response.json({ error: `mapillary ${res.status}` }, { status: 502 })
  const { data = [] } = await res.json()

  const candidates = data
    .filter((img) => !img.is_pano && img.thumb_1024_url)
    .map((img) => {
      const [lng, lat] = (img.computed_geometry || img.geometry).coordinates
      const at = { lat, lng }
      const facing = img.computed_compass_angle ?? img.compass_angle
      return { img, dist: meters(at, place), gap: angleGap(facing, bearing(at, place)) }
    })
    .filter((c) => c.dist >= 4 && c.dist <= 70 && c.gap <= 45)
    // Lower score is better: close, facing the place, and recent (5 points per year of age).
    .map((c) => ({ ...c, score: c.dist + c.gap + ((Date.now() - c.img.captured_at) / 3.15e10) * 5 }))
    .sort((a, b) => a.score - b.score)

  let body
  if (!candidates.length) {
    body = { photo: null }
  } else {
    const { img } = candidates[0]
    const photo = {
      url: img.thumb_1024_url,
      page: `https://www.mapillary.com/app/?pKey=${img.id}`,
      capturedAt: new Date(img.captured_at).toISOString(),
      author: img.creator?.username || null
    }
    let ai = null
    if (env.AI) {
      try {
        const bytes = new Uint8Array(await (await fetch(img.thumb_1024_url, { signal: AbortSignal.timeout(8000) })).arrayBuffer())
        ai = await readEntrance(env, bytes)
      } catch (err) {
        ai = { error: err.message }
      }
    }
    body = { photo, ai }
  }

  // Cache only complete answers, so a temporary AI failure is retried next time.
  // "No photo" is cached for a day only, since new photos get uploaded.
  const complete = !body.photo || (body.ai && !body.ai.error)
  const maxAge = body.photo ? 604800 : 86400
  const out = Response.json(body, { headers: { 'Cache-Control': complete ? `public, max-age=${maxAge}` : 'no-store' } })
  if (complete) waitUntil(cache.put(key, out.clone()))
  return out
}
