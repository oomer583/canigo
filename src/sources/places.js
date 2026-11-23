// Places that exist but nobody has checked (Overture Maps, CDLA Permissive 2.0),
// built per city by the weekly GitHub Action (scripts/build-places.py).
import { distanceMeters } from '../geocode.js'

const loaded = new Map()

export function loadPlaces(cityId) {
  if (!loaded.has(cityId)) {
    const p = fetch(`/packs/${cityId}-places.json`).then((r) => (r.ok ? r.json() : { places: [] }))
    p.catch(() => loaded.delete(cityId))
    loaded.set(cityId, p)
  }
  return loaded.get(cityId)
}

// [[name, lat, lng, category], ...] -> places near a point in the given categories.
export function placesNear(pack, at, radiusMeters, tags) {
  const out = []
  for (const [name, lat, lng, category] of pack.places || []) {
    if (!tags.includes(category)) continue
    const d = distanceMeters({ lat, lng }, at)
    if (d <= radiusMeters) out.push({ id: `ov-${name}-${lat}-${lng}`, name, lat, lng, category, records: [], distance: Math.round(d), unchecked: true })
  }
  return out.sort((a, b) => a.distance - b.distance)
}

// "hemingway" finds "Hemingway Wine & Cocktail Bar"; ə/ı/ö and case are ignored.
export function fold(s) {
  return String(s).toLocaleLowerCase('en').replace(/ə/g, 'e').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Name search inside the city's own packs (OSM checked places + Overture), for places the
// public search services don't know. Every word of the query must appear in the name.
export function placesByName(names, query, limit = 5) {
  const words = fold(query).split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  if (!words.length) return []
  const hits = names.filter((p) => {
    const n = fold(p.name)
    return words.every((w) => n.includes(w))
  })
  return hits.sort((a, b) => a.name.length - b.name.length).slice(0, limit)
}
