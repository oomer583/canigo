// Cloudflare Pages Function: turns a free sentence ("is there a pharmacy within 2 km?",
// "yaxınlıqda kafe", "кафе рядом") into a search the app already knows how to run.
// POST /api/understand {q}  ->  {category: id|null, km: number|null, name: string|null}
// The model only reads the sentence. It never says whether an entrance is accessible.

const MODELS = ['@cf/meta/llama-4-scout-17b-16e-instruct', '@cf/google/gemma-4-26b-a4b-it']
const IDS = ['coffee', 'food', 'pharmacy', 'toilet', 'shop', 'health', 'museum']

const PROMPT = `You read one search typed into a map app, in any language, and turn it into JSON.
Categories: coffee (cafes, tea, bakeries), food (restaurants, fast food), pharmacy, toilet,
shop (supermarkets, groceries), health (hospitals, clinics, doctors), museum (museums, galleries).
Reply with JSON only, no other text:
{"category": one of ${IDS.map((i) => `"${i}"`).join(', ')} or null, "km": distance in km if the user gave one, else null, "name": the name of one specific place if the user named one, else null}
If the user names a specific place, set name and leave category null.`

// Pulls the first JSON object out of the model's text and keeps only values the app can use.
export function readIntent(text) {
  const m = String(text || '').match(/\{[\s\S]*\}/)
  if (!m) return null
  let raw
  try {
    raw = JSON.parse(m[0])
  } catch {
    return null
  }
  const category = IDS.includes(raw.category) ? raw.category : null
  let km = Number(raw.km)
  km = Number.isFinite(km) && km > 0 ? Math.min(Math.round(km * 10) / 10, 25) : null
  const name = typeof raw.name === 'string' ? raw.name.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 120) || null : null
  if (!category && !name) return null
  return { category: name ? null : category, km, name }
}

function textOf(out) {
  if (typeof out === 'string') return out
  if (typeof out?.response === 'string') return out.response
  if (out?.response && typeof out.response === 'object') return JSON.stringify(out.response)
  return out?.choices?.[0]?.message?.content || ''
}

export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.AI) return Response.json({ error: 'not-configured' }, { status: 503 })
  let q
  try {
    q = String((await request.json())?.q || '').trim().slice(0, 200)
  } catch {
    return Response.json({ error: 'invalid JSON' }, { status: 400 })
  }
  if (!q) return Response.json({ error: 'q is required' }, { status: 400 })

  const cache = caches.default
  const key = new Request(`https://canigo-understand/v1/${encodeURIComponent(q.toLowerCase())}`)
  const hit = await cache.match(key)
  if (hit) return hit

  for (const model of MODELS) {
    try {
      const out = await env.AI.run(model, {
        messages: [
          { role: 'system', content: PROMPT },
          { role: 'user', content: q }
        ],
        max_tokens: 80,
        temperature: 0
      })
      const intent = readIntent(textOf(out))
      const res = Response.json({ ...(intent || { category: null, km: null, name: null }), model }, { headers: { 'Cache-Control': 'max-age=86400' } })
      waitUntil(cache.put(key, res.clone()))
      return res
    } catch {
      // try the next model
    }
  }
  return Response.json({ error: 'no model answered' }, { status: 502 })
}
