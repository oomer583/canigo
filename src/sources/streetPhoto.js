// Street-level photo of the entrance (Mapillary) read by a vision model,
// through our own server function (functions/api/entrance.js).

export function recordFromPhoto(result) {
  if (!result?.photo || !result.ai || result.ai.error) return null
  const { steps, ramp, note } = result.ai
  let status = 'unknown'
  if (steps === 'yes' && ramp !== 'yes') status = 'no'
  else if (steps === 'no' || ramp === 'yes') status = 'yes'
  if (status === 'unknown') return null
  return {
    source: 'Street photo, AI estimate',
    sourceUrl: result.photo.page,
    status,
    detail: note,
    doorWidthCm: null,
    steps: steps === 'no' ? 0 : null,
    updatedAt: result.photo.capturedAt,
    ai: true
  }
}

export async function entrancePhoto(lat, lng, signal) {
  const res = await fetch(`/api/entrance?lat=${lat}&lng=${lng}`, { signal })
  if (!res.ok) return null
  return res.json()
}
