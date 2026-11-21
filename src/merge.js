import { distanceMeters } from './geocode.js'

// Different sources often list the same shop twice ("Madame Tussauds" and
// "Madame Tussauds Amsterdam"). Merge places that are close and share a name core.

export function nameKey(name = '') {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['the', 'and', 'amsterdam', 'restaurant', 'cafe', 'shop'].includes(w))
    .join(' ')
}

function similar(a, b) {
  const ka = nameKey(a)
  const kb = nameKey(b)
  if (!ka || !kb) return false
  return ka === kb || ka.includes(kb) || kb.includes(ka)
}

export function mergePlaces(places, maxMeters = 40) {
  const groups = []
  for (const p of places) {
    const g = groups.find((x) => similar(x.name, p.name) && distanceMeters(x, p) <= maxMeters)
    if (g) {
      g.records.push(p.record)
      if (p.name.length < g.name.length) g.name = p.name
      if (!g.phone && p.phone) g.phone = p.phone
    } else {
      groups.push({ id: p.id, name: p.name, lat: p.lat, lng: p.lng, phone: p.phone || null, category: p.category, records: [p.record] })
    }
  }
  return groups
}
