// Places of one kind near the user, best fit for their profile first.
import { placesNear, hasToken } from './sources/accessibilityCloud.js'
import { loadPack, packNear, inside } from './sources/cityPack.js'
import { forProfile } from './verdict.js'
import { distanceMeters } from './geocode.js'
import { CATEGORIES, inCategory, isCannabis } from './categories.js'
import { loadPlaces, placesNear as overtureNear, placesByName } from './sources/places.js'
import { mergePlaces, nameKey } from './merge.js'

const RANK = { yes: 0, partial: 1, unknown: 2, no: 3 }

export function rankPlaces(groups, at, profile) {
  return groups
    .map((g) => ({ ...g, verdict: forProfile(g.records, profile), distance: Math.round(distanceMeters(g, at)) }))
    .sort((a, b) => RANK[a.verdict.tone] - RANK[b.verdict.tone] || a.distance - b.distance)
}

// Every named place around a point, from the city pack and accessibility.cloud.
async function gatherAround(at, { city, radius, signal }) {
  const [pack, ac] = await Promise.allSettled([
    city && inside(city, at.lat, at.lng) ? loadPack(city.id).then((p) => packNear(p, at.lat, at.lng, radius).places) : Promise.resolve([]),
    hasToken ? placesNear(at.lat, at.lng, Math.min(radius, 1000), signal) : Promise.resolve([])
  ])
  const all = [...(pack.status === 'fulfilled' ? pack.value : []), ...(ac.status === 'fulfilled' ? ac.value : [])]
  // A place another source marks as a cannabis shop is dropped from every source.
  const banned = new Set(all.filter(isCannabis).map((p) => nameKey(p.name)))
  // A list of "Unnamed place" rows helps nobody: keep only places with a name.
  return all.filter((p) => p.name && p.name !== 'Unnamed place' && !banned.has(nameKey(p.name)))
}

export async function findNearby(category, at, { city, profile, radius = 1200, signal } = {}) {
  const named = await gatherAround(at, { city, radius, signal })
  const groups = mergePlaces(named.filter((p) => inCategory(p, category)))
  return rankPlaces(groups, at, profile).slice(0, 25)
}

// "Where can I go near me?": places of every kind nearby that this person can get into.
// A few per kind, so one street of cafés doesn't fill the whole list; nearest first.
export async function accessibleAround(at, { city, profile, radius = 1000, perCategory = 3, limit = 15, signal } = {}) {
  const named = await gatherAround(at, { city, radius, signal })
  const out = []
  for (const kind of CATEGORIES) {
    const groups = mergePlaces(named.filter((p) => inCategory(p, kind)))
    rankPlaces(groups, at, profile)
      .filter((i) => i.verdict.tone === 'yes')
      .slice(0, perCategory)
      .forEach((i) => out.push({ ...i, kind }))
  }
  return out.sort((a, b) => a.distance - b.distance).slice(0, limit)
}

// When the answer is red: places of the same kind nearby that this person can get into.
// Only places whose kind we know (café, museum, ...), so the alternative is a real substitute.
export async function alternativesNear(place, { city, profile, limit = 3 } = {}) {
  const category = CATEGORIES.find((c) => inCategory(place, c))
  if (!category) return []
  const items = await findNearby(category, place, { city, profile, radius: 1500 })
  return items.filter((i) => i.verdict.tone === 'yes' && nameKey(i.name) !== nameKey(place.name)).slice(0, limit)
}

// The user's position, or null if they say no or it takes too long.
export function currentPosition(timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    // The browser's own timeout does not run while the permission prompt is open.
    const timer = setTimeout(() => resolve(null), timeoutMs + 4000)
    const done = (v) => { clearTimeout(timer); resolve(v) }
    navigator.geolocation.getCurrentPosition(
      (p) => done({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => done(null),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 }
    )
  })
}

// Places of this kind that exist nearby but have no entrance information yet.
export async function uncheckedNearby(category, at, { city, checked = [], radius = 5000, limit = 15 } = {}) {
  if (!city || !inside(city, at.lat, at.lng)) return []
  const pack = await loadPlaces(city.id).catch(() => ({ places: [] }))
  const known = new Set(checked.map((c) => nameKey(c.name)))
  return overtureNear(pack, at, radius, category.tags)
    .filter((p) => !isCannabis(p) && !known.has(nameKey(p.name)) && !checked.some((c) => distanceMeters(c, p) < 25))
    .slice(0, limit)
}

// Fallback name search in the chosen city's packs. OSM entries carry their wheelchair tag.
export async function searchCityPacks(city, query) {
  const [osm, ov] = await Promise.all([
    loadPack(city.id).catch(() => ({ elements: [] })),
    loadPlaces(city.id).catch(() => ({ places: [] }))
  ])
  const names = [
    // Buildings (ways) carry a centre point instead of lat/lon.
    ...(osm.elements || []).filter((e) => e.tags?.name && (e.lat ?? e.center?.lat) != null).map((e) => ({
      name: e.tags.name, label: `${e.tags.name}, ${city.name}`, lat: e.lat ?? e.center.lat, lng: e.lon ?? e.center.lon,
      phone: e.tags.phone || e.tags['contact:phone'] || null, osmWheelchair: e.tags.wheelchair || null
    })),
    ...(ov.places || []).map(([name, lat, lng]) => ({ name, label: `${name}, ${city.name}`, lat, lng, phone: null, osmWheelchair: null }))
  ]
  return placesByName(names, query)[0] || null
}
