// Visit counts with Cloudflare Web Analytics: no cookies, no personal data, only page views.
// Open the site once with ?nostats=1 on a device to stop counting it (for testing); ?nostats=0 undoes it.
// The setting is per address, so do it on both canigo-app.pages.dev and the Türkiye mirror.
const TOKEN = '6ed43d34957a49fcb90ec8e43f7db523'
const KEY = 'canigo.nostats'

export function notCounted() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function startStats() {
  try {
    const url = new URL(location.href)
    const flag = url.searchParams.get('nostats')
    if (flag === '1') localStorage.setItem(KEY, '1')
    if (flag === '0') localStorage.removeItem(KEY)
    if (flag !== null) {
      url.searchParams.delete('nostats')
      history.replaceState(null, '', url.pathname + url.search + url.hash)
    }
  } catch {
    // storage blocked: count the visit as usual
  }
  if (notCounted() || ['localhost', '127.0.0.1'].includes(location.hostname)) return
  const s = document.createElement('script')
  s.defer = true
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js'
  s.setAttribute('data-cf-beacon', JSON.stringify({ token: TOKEN }))
  document.head.appendChild(s)
}
