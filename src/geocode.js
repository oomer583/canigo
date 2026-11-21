// Place search: OpenStreetMap's Nominatim first (exact names, phone and wheelchair tags),
// then Photon (komoot), which forgives typos and partial names, biased to the user's city.
// Usage policies: we only search when the user submits.

// Shorter versions of a query, for names people half remember:
// "Milli Idman Tibb ve Reabilitasiya Institutu" -> without the first word, without the last word, ...
export function queryVariants(query) {
  const words = query.trim().split(/\s+/).filter(Boolean)
  const out = [words.join(' ')]
  if (words.length > 2) out.push(words.slice(1).join(' '), words.slice(0, -1).join(' '))
  if (words.length > 3) out.push(words.slice(1, -1).join(' '))
  return [...new Set(out)]
}

export async function search(query, signal, near = null) {
  const exact = await nominatim(query, signal)
  if (exact.length) return exact
  for (const q of queryVariants(query)) {
    const rows = await photon(q, signal, near)
    if (rows.length) return rows
  }
  return []
}

async function photon(query, signal, near) {
  const bias = near ? `&lat=${near.lat}&lon=${near.lng}` : ''
  const res = await fetch(`https://photon.komoot.io/api/?limit=5&q=${encodeURIComponent(query)}${bias}`, { signal })
  if (!res.ok) return []
  const { features = [] } = await res.json()
  return features
    .filter((f) => f.properties?.name)
    .map((f) => ({
      name: f.properties.name,
      label: [f.properties.name, f.properties.street, f.properties.city, f.properties.country].filter(Boolean).join(', '),
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      phone: null,
      osmWheelchair: null
    }))
}

async function nominatim(query, signal) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&extratags=1&q=${encodeURIComponent(query)}`
  const res = await fetch(url, { signal, headers: { 'Accept-Language': 'en' } })
  if (!res.ok) throw new Error(`search failed (${res.status})`)
  const rows = await res.json()
  return rows.map((r) => ({
    name: r.name || r.display_name.split(',')[0],
    label: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
    phone: r.extratags?.phone || r.extratags?.['contact:phone'] || null,
    osmWheelchair: r.extratags?.wheelchair || null
  }))
}

export function distanceMeters(a, b) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
