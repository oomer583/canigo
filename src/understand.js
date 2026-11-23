// Free sentences go to /api/understand only when the simple word match can't read them.
import { CATEGORIES } from './categories.js'

// "coffee", "Rijksmuseum" or "Sixty 6" are handled without AI; "pharmacy within 2 km" or "где поесть рядом" are not.
export function looksLikeSentence(query) {
  const words = query.trim().split(/\s+/).filter(Boolean)
  // A number alone is not a sentence: "Sixty 6", "Studio 54" and "Cafe 33" are names. A distance is.
  const distance = /\d+(?:[.,]\d+)?\s*(?:km|m|metre|meter|mile|mi|км|м|kilometr|kilometre|metr)\b/i.test(query)
  return words.length >= 3 || distance || /\?$/.test(query.trim())
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
