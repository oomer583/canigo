// OpenStreetMap via the Overpass API: wheelchair tags on places, and entrance
// details (door width, step count) on entrance nodes. Every element carries the
// date it was last edited, which lets CanIGo tell newer data from older data.
// Data © OpenStreetMap contributors, ODbL.
import { toCm } from './accessibilityCloud.js'

const STATUS = { yes: 'yes', designated: 'yes', limited: 'partial', no: 'no' }

function osmUrl(el) {
  return `https://www.openstreetmap.org/${el.type}/${el.id}`
}

function point(el) {
  if (typeof el.lat === 'number') return { lat: el.lat, lng: el.lon }
  if (el.center) return { lat: el.center.lat, lng: el.center.lon }
  return null
}

export function entranceFromTags(tags = {}) {
  const doorWidthCm = toCm(tags['door:width'] ?? tags['width'] ?? tags['entrance:width'])
  let steps = null
  if (tags.step_count != null && !Number.isNaN(Number(tags.step_count))) steps = Number(tags.step_count)
  else if (tags.door === 'no' && tags.wheelchair === 'yes') steps = 0
  let detail = null
  if (tags.ramp === 'yes' || tags['ramp:wheelchair'] === 'yes') detail = 'Ramp at the entrance'
  else if (steps === 0) detail = 'Level entrance, no steps'
  if (tags['wheelchair:description']) detail = tags['wheelchair:description']
  return { doorWidthCm, steps, detail, status: STATUS[tags.wheelchair] || 'unknown', main: tags.entrance === 'main' }
}

// Split Overpass elements into named places and entrances.
export function parseOverpass(elements = []) {
  const places = []
  const entrances = []
  for (const el of elements) {
    const at = point(el)
    if (!at) continue
    const tags = el.tags || {}
    const updatedAt = el.timestamp || null
    if (tags.entrance || tags.door) {
      entrances.push({ ...at, ...entranceFromTags(tags), updatedAt, url: osmUrl(el) })
      continue
    }
    if (!tags.name) continue
    const facts = entranceFromTags(tags)
    places.push({
      id: `osm-${el.type}-${el.id}`,
      name: tags.name,
      category: tags.amenity || tags.shop || tags.tourism || null,
      phone: tags.phone || tags['contact:phone'] || null,
      lat: at.lat,
      lng: at.lng,
      record: {
        source: 'OpenStreetMap',
        sourceUrl: osmUrl(el),
        status: STATUS[tags.wheelchair] || 'unknown',
        detail: tags['wheelchair:description'] || facts.detail,
        doorWidthCm: facts.doorWidthCm,
        steps: facts.steps,
        updatedAt
      }
    })
  }
  return { places, entrances }
}

// Goes through our own Cloudflare function (functions/api/osm.js), which runs
// Overpass server-side with mirrors and a one-day cache.
export async function osmNear(lat, lng, radiusMeters = 60, signal) {
  const res = await fetch(`/api/osm?lat=${lat}&lng=${lng}&r=${radiusMeters}`, { signal })
  if (!res.ok) throw new Error(`OpenStreetMap answered ${res.status}`)
  const data = await res.json()
  return parseOverpass(data.elements)
}
