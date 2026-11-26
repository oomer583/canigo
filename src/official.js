// The addresses where the real CanIGo runs. Anyone may copy the code (MIT), but a copy on any
// other address shows a note pointing people to the official app, so nobody mistakes it for ours.
// Add a host here when a new official mirror goes live.

// The one address shown to people (footer, copy note). Other official hosts below
// are the technical origin and mirrors; they stay official but are not advertised.
export const OFFICIAL_URL = 'https://canigo-three.vercel.app'

export const OFFICIAL_HOSTS = [
  'canigo-app.pages.dev',
  'canigo-three.vercel.app'
]

export function isOfficial(host) {
  const h = String(host || '').toLowerCase()
  if (h === 'localhost' || h === '127.0.0.1' || h === '[::1]') return true
  // Cloudflare preview builds live on <hash>.canigo-app.pages.dev
  if (h.endsWith('.canigo-app.pages.dev')) return true
  return OFFICIAL_HOSTS.includes(h)
}
