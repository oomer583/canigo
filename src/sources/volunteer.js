// Volunteer entrance reports ("I've been here"), stored by functions/api/contrib.js.
// Shown as "Volunteer, not verified": useful where nothing else exists, never hidden as fact.
import { distanceMeters } from '../geocode.js'

export function recordFromVolunteer(c) {
  let status = 'unknown'
  if (c.steps === 0 || c.ramp === 'yes') status = 'yes'
  else if (c.steps > 0 && c.ramp !== 'yes') status = 'no'
  const parts = []
  if (c.steps === 0) parts.push('no steps')
  else if (c.steps >= 4) parts.push('4 or more steps')
  else if (c.steps > 0) parts.push(`${c.steps} step${c.steps > 1 ? 's' : ''}`)
  if (c.ramp === 'yes') parts.push('a ramp')
  else if (c.ramp === 'no') parts.push('no ramp')
  if (c.doorCm) parts.push(`door ${c.doorCm} cm`)
  return {
    source: 'Volunteer, not verified',
    sourceUrl: null,
    status,
    detail: parts.length ? `A volunteer reported ${parts.join(', ')}.` : null,
    doorWidthCm: c.doorCm ?? null,
    steps: c.steps ?? null,
    updatedAt: c.createdAt,
    volunteer: true,
    contribId: c.id
  }
}

export async function volunteerNear(place, signal) {
  const res = await fetch(`/api/contrib?lat=${place.lat}&lng=${place.lng}`, { signal })
  if (!res.ok) return []
  const { results = [] } = await res.json()
  return results.filter((c) => distanceMeters(c, place) <= 40).map(recordFromVolunteer)
}

export async function sendVolunteer(entry) {
  const res = await fetch('/api/contrib', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Could not save (${res.status})`)
  return recordFromVolunteer(data)
}

export async function reportWrong(id) {
  const res = await fetch('/api/contrib', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ report: id }) })
  return res.ok
}
