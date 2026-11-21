// accessibility.cloud: one API that bundles Wheelmap, OpenStreetMap and 150+ other sources.
// Docs: https://github.com/sozialhelden/accessibility-cloud/blob/main/app/docs/json-api.md
// The app token is designed to be used from the browser.

const BASE = 'https://www.accessibility.cloud/place-infos.json'
const TOKEN = import.meta.env.VITE_ACCESSIBILITY_CLOUD_TOKEN

export const hasToken = Boolean(TOKEN)

function pickName(name) {
  if (!name) return 'Unnamed place'
  if (typeof name === 'string') return name
  return name.en || name['en-US'] || Object.values(name)[0] || 'Unnamed place'
}

export function statusFromA11y(a11y = {}) {
  const full = a11y.accessibleWith?.wheelchair
  const part = a11y.partiallyAccessibleWith?.wheelchair
  if (full === true) return 'yes'
  if (part === true) return 'partial'
  if (full === false) return 'no'
  return 'unknown'
}

function detailFromA11y(a11y = {}) {
  const entrance = Array.isArray(a11y.entrances) ? a11y.entrances[0] : null
  if (!entrance) return null
  if (entrance.hasFixedRamp || entrance.hasRemovableRamp) return 'Ramp at the entrance'
  if (entrance.isLevel === true) return 'Level entrance, no steps'
  const steps = entrance.stairs?.count
  if (typeof steps === 'number' && steps > 0) return `${steps} step${steps > 1 ? 's' : ''} at the entrance`
  return null
}

export function normalizeFeature(feature) {
  const p = feature.properties || {}
  const [lng, lat] = feature.geometry?.coordinates || [null, null]
  const a11y = p.accessibility || {}
  return {
    id: feature._id || p._id || p.originalId || `${lat},${lng}`,
    name: pickName(p.name),
    category: p.category || null,
    lat,
    lng,
    record: {
      source: 'accessibility.cloud',
      sourceUrl: p.infoPageUrl || 'https://www.accessibility.cloud',
      status: statusFromA11y(a11y),
      detail: detailFromA11y(a11y),
      updatedAt: p.updatedAt || p.lastUpdated || null
    }
  }
}

export async function placesNear(lat, lng, radiusMeters = 150, signal) {
  if (!TOKEN) throw new Error('missing-token')
  const url = `${BASE}?appToken=${encodeURIComponent(TOKEN)}&latitude=${lat}&longitude=${lng}&accuracy=${radiusMeters}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`accessibility.cloud answered ${res.status}`)
  const data = await res.json()
  return (data.features || []).map(normalizeFeature).filter((p) => p.lat != null)
}
