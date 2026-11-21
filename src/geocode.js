// Place search with OpenStreetMap's Nominatim.
// Usage policy: at most 1 request per second, so we only search when the user submits.
export async function search(query, signal) {
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
