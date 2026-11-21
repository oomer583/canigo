// Turns an osmium GeoJSON-seq export into a small city pack for the app.
// Usage: node scripts/build-pack.mjs <cityId> <export.geojsonseq>
// Output: public/packs/<cityId>.json, in the same shape as Overpass elements,
// so src/sources/osm.js can read it with parseOverpass().
// Data © OpenStreetMap contributors, ODbL.
import { readFileSync, writeFileSync } from 'node:fs'
import { isoTime } from '../src/sources/osm.js'

const KEEP = [
  'name', 'wheelchair', 'wheelchair:description', 'entrance', 'door', 'door:width', 'width', 'entrance:width',
  'step_count', 'ramp', 'ramp:wheelchair', 'amenity', 'shop', 'tourism', 'phone', 'contact:phone'
]

export function centre(geometry) {
  const pts = []
  const walk = (c) => (typeof c[0] === 'number' ? pts.push(c) : c.forEach(walk))
  walk(geometry.coordinates)
  const lng = pts.reduce((s, p) => s + p[0], 0) / pts.length
  const lat = pts.reduce((s, p) => s + p[1], 0) / pts.length
  return { lat: +lat.toFixed(6), lon: +lng.toFixed(6) }
}

export function toElement(feature) {
  const p = feature.properties || {}
  const tags = {}
  for (const k of KEEP) if (p[k] != null) tags[k] = String(p[k])
  const useful = tags.wheelchair || tags.entrance || tags.door || tags['door:width'] || tags.step_count || tags.ramp
  if (!useful) return null
  const type = p['@type'] || 'node'
  const at = centre(feature.geometry)
  const el = { type, id: p['@id'], tags, timestamp: isoTime(p['@timestamp']) }
  if (type === 'node') Object.assign(el, at)
  else el.center = at
  return el
}

if (process.argv[1]?.endsWith('build-pack.mjs')) {
  const [cityId, file] = process.argv.slice(2)
  const lines = readFileSync(file, 'utf8').split('\n')
  const elements = []
  for (const line of lines) {
    const clean = line.replace(/^\x1e/, '').trim()
    if (!clean) continue
    const el = toElement(JSON.parse(clean))
    if (el) elements.push(el)
  }
  const out = { city: cityId, builtAt: new Date().toISOString(), count: elements.length, elements }
  writeFileSync(`public/packs/${cityId}.json`, JSON.stringify(out))
  console.log(`${cityId}: ${elements.length} places and entrances`)
}
