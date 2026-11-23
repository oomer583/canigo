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

// The same fact listed twice must not look like two sources agreeing:
// identical records collapse, and Wheelmap's OSM mirror is dropped whenever OpenStreetMap itself is there:
// the mirror is a copy of OSM, so when they differ the copy is out of date (or is a nearby tram stop).
const isOsm = (r) => /^OpenStreetMap/i.test(r.source || '')
const isOsmMirror = (r) => /OSM Mirror/i.test(r.source || '')

export function dedupeRecords(records) {
  const out = []
  for (const r of records) {
    if (out.some((o) => o.source === r.source && o.status === r.status && String(o.updatedAt) === String(r.updatedAt))) continue
    out.push(r)
  }
  return out.filter((r) => !(isOsmMirror(r) && out.some(isOsm)))
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
  for (const g of groups) g.records = dedupeRecords(g.records)
  return groups
}
