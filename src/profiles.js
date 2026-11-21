// "How do you get around?" Each profile describes needs, not bodies.
// widthCm: the narrowest door the user can pass through.
// steps: how many steps the user can manage at an entrance (0 = none).
export const PROFILES = [
  { id: 'manual', label: 'Manual wheelchair', widthCm: 70, steps: 0 },
  { id: 'power', label: 'Power wheelchair', widthCm: 75, steps: 0 },
  { id: 'wide', label: 'Wide wheelchair', widthCm: 90, steps: 0 },
  { id: 'walker', label: 'Walker or gait trainer', widthCm: 75, steps: 0 },
  { id: 'stroller', label: 'Stroller or pram', widthCm: 65, steps: 1 },
  { id: 'steps-hard', label: 'Steps are hard for me', widthCm: 60, steps: 1 },
  { id: 'crutches', label: 'Crutches or a cane', widthCm: 70, steps: 2 }
]

const KEY = 'canigo.profile'

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile))
  } catch {
    // storage can be unavailable (private mode); the app still works for this visit
  }
}
