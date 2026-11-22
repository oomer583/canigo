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
