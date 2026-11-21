// Places of one kind near the user, best fit for their profile first.
import { placesNear, hasToken } from './sources/accessibilityCloud.js'
import { loadPack, packNear, inside } from './sources/cityPack.js'
import { forProfile } from './verdict.js'
import { distanceMeters } from './geocode.js'
import { inCategory, isCannabis } from './categories.js'
import { mergePlaces, nameKey } from './merge.js'

const RANK = { yes: 0, partial: 1, unknown: 2, no: 3 }

export function rankPlaces(groups, at, profile) {
  return groups
    .map((g) => ({ ...g, verdict: forProfile(g.records, profile), distance: Math.round(distanceMeters(g, at)) }))
    .sort((a, b) => RANK[a.verdict.tone] - RANK[b.verdict.tone] || a.distance - b.distance)
}

export async function findNearby(category, at, { city, profile, radius = 1200, signal } = {}) {
  const [pack, ac] = await Promise.allSettled([
    city && inside(city, at.lat, at.lng) ? loadPack(city.id).then((p) => packNear(p, at.lat, at.lng, radius).places) : Promise.resolve([]),
    hasToken ? placesNear(at.lat, at.lng, Math.min(radius, 1000), signal) : Promise.resolve([])
  ])
  const all = [...(pack.status === 'fulfilled' ? pack.value : []), ...(ac.status === 'fulfilled' ? ac.value : [])]
  // A place another source marks as a cannabis shop is dropped from every source.
  const banned = new Set(all.filter(isCannabis).map((p) => nameKey(p.name)))
  // A list of "Unnamed place" rows helps nobody: keep only places with a name.
  const named = all.filter((p) => p.name && p.name !== 'Unnamed place')
  const groups = mergePlaces(named.filter((p) => inCategory(p, category) && !banned.has(nameKey(p.name))))
  return rankPlaces(groups, at, profile).slice(0, 25)
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
