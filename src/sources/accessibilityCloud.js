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

// A11yJSON lengths come as 90, "90cm", "0.9 m" or { value: 90, unit: 'cm' }.
export function toCm(length) {
  if (length == null) return null
  if (typeof length === 'number') return length > 10 ? Math.round(length) : Math.round(length * 100)
  if (typeof length === 'object' && typeof length.value === 'number') {
    const unit = (length.unit || 'cm').toLowerCase()
    if (unit === 'mm') return Math.round(length.value / 10)
    if (unit === 'm' || unit === 'meter' || unit === 'meters') return Math.round(length.value * 100)
    return Math.round(length.value)
  }
  const m = String(length).trim().match(/^([\d.,]+)\s*(cm|mm|m)?$/i)
  if (!m) return null
  const v = parseFloat(m[1].replace(',', '.'))
  // No unit: OpenStreetMap uses metres (0.8), other sources centimetres (80).
  const unit = (m[2] || (v < 10 ? 'm' : 'cm')).toLowerCase()
  return Math.round(unit === 'm' ? v * 100 : unit === 'mm' ? v / 10 : v)
}

function entranceFacts(a11y = {}) {
  const e = Array.isArray(a11y.entrances) ? a11y.entrances[0] : null
  if (!e) return { detail: null, doorWidthCm: null, steps: null }
  const doorWidthCm = toCm(e.door?.width ?? e.doorWidth)
  let steps = typeof e.stairs?.count === 'number' ? e.stairs.count : null
  if (steps == null && e.isLevel === true) steps = 0
  let detail = null
  if (e.hasFixedRamp || e.hasRemovableRamp) detail = 'Ramp at the entrance'
  else if (e.isLevel === true) detail = 'Level entrance, no steps'
  return { detail, doorWidthCm, steps }
}

export function normalizeFeature(feature, sources = {}) {
  const p = feature.properties || {}
  const [lng, lat] = feature.geometry?.coordinates || [null, null]
  const a11y = p.accessibility || {}
  const facts = entranceFacts(a11y)
  const sourceName = sources[p.sourceId]?.name
  return {
    id: feature._id || p._id || p.originalId || `${lat},${lng}`,
    name: pickName(p.name),
    category: p.category || null,
    phone: p.phoneNumber || p.phone || null,
    lat,
    lng,
    record: {
      source: sourceName ? `${sourceName} (via accessibility.cloud)` : 'accessibility.cloud',
      sourceUrl: p.infoPageUrl || p.placeWebsiteUrl || 'https://www.accessibility.cloud',
      status: statusFromA11y(a11y),
      detail: facts.detail,
      doorWidthCm: facts.doorWidthCm,
      steps: facts.steps,
      updatedAt: p.updatedAt || p.lastUpdated || null
    }
  }
}

export async function placesNear(lat, lng, radiusMeters = 150, signal) {
  if (!TOKEN) throw new Error('missing-token')
  const url = `${BASE}?appToken=${encodeURIComponent(TOKEN)}&latitude=${lat}&longitude=${lng}&accuracy=${radiusMeters}&includeRelated=source`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`accessibility.cloud answered ${res.status}`)
  const data = await res.json()
  const sources = data.related?.sources || {}
  return (data.features || []).map((f) => normalizeFeature(f, sources)).filter((p) => p.lat != null)
}
