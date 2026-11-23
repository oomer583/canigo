// Turkey mirror for CanIGo.
// pages.dev is blocked in Turkey (TFF decision, 25 Nov 2025), so this Worker serves the same
// site from canigo.kerimli270.workers.dev by fetching every request from canigo-app.pages.dev.
// Paste this into the Cloudflare dashboard: Workers & Pages > canigo > Edit code > Deploy.
// Note: volunteer rate limits see the Worker, not each visitor, so Turkish visitors share one limit.

const ORIGIN = 'https://canigo-app.pages.dev'

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const target = new URL(url.pathname + url.search, ORIGIN)
    const res = await fetch(new Request(target, request), { redirect: 'manual' })
    // Keep redirects on this address instead of sending people back to the blocked domain.
    const location = res.headers.get('Location')
    if (location && location.startsWith(ORIGIN)) {
      const headers = new Headers(res.headers)
      headers.set('Location', location.replace(ORIGIN, url.origin))
      return new Response(res.body, { status: res.status, headers })
    }
    return res
  }
}
