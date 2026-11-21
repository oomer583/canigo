// Offline city packs: OpenStreetMap accessibility data for one city, built
// weekly by a GitHub Action (scripts/build-pack.mjs) and cached by the app,
// so answers work without Overpass and without a connection.
// Data © OpenStreetMap contributors, ODbL.
import { parseOverpass } from './osm.js'
import { distanceMeters } from '../geocode.js'

const KEY = 'canigo.city'

export function loadCity() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null
  } catch {
    return null
  }
}

export function saveCity(city) {
  try {
    if (city) localStorage.setItem(KEY, JSON.stringify(city))
    else localStorage.removeItem(KEY)
  } catch {
    // storage can be unavailable; the app still works for this visit
  }
}

export async function listCities(signal) {
  const res = await fetch('/packs/index.json', { signal })
  if (!res.ok) return []
  return res.json()
}

export function inside(city, lat, lng) {
  const [w, s, e, n] = city.bbox
  return lng >= w && lng <= e && lat >= s && lat <= n
}

const loaded = new Map()

export function loadPack(cityId) {
  if (!loaded.has(cityId)) {
    const p = fetch(`/packs/${cityId}.json`).then((r) => {
      if (!r.ok) throw new Error(`pack ${r.status}`)
      return r.json()
    })
    p.catch(() => loaded.delete(cityId))
    loaded.set(cityId, p)
  }
  return loaded.get(cityId)
}

// Same result shape as osmNear(): { places, entrances }.
export function packNear(pack, lat, lng, radiusMeters = 60) {
  const here = { lat, lng }
  const near = pack.elements.filter((el) => {
    const at = typeof el.lat === 'number' ? { lat: el.lat, lng: el.lon } : el.center ? { lat: el.center.lat, lng: el.center.lon } : null
    return at && distanceMeters(at, here) <= radiusMeters
  })
  return parseOverpass(near)
}
