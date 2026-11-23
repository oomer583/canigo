// Free sentences go to /api/understand only when the simple word match can't read them.
import { CATEGORIES } from './categories.js'

// "coffee" or "Rijksmuseum" are handled without AI; "pharmacy within 2 km" or "где поесть рядом" are not.
export function looksLikeSentence(query) {
  const words = query.trim().split(/\s+/).filter(Boolean)
  return words.length >= 3 || /\d/.test(query) || /\?$/.test(query.trim())
}

export async function understand(query, signal) {
  const timeout = new AbortController()
  const timer = setTimeout(() => timeout.abort(), 6000)
  signal?.addEventListener('abort', () => timeout.abort())
  try {
    const res = await fetch('/api/understand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query }),
      signal: timeout.signal
    })
    if (!res.ok) return null
    const out = await res.json()
    const category = CATEGORIES.find((c) => c.id === out.category) || null
    if (!category && !out.name) return null
    return { category, km: typeof out.km === 'number' ? out.km : null, name: out.name || null }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
