// Records real sessions of the local build (same code as the live site) at 30 fps.
// Offline here: no map tiles (map hidden), no geocoder (city packs answer), /api/understand answered with the real API's schema.
import puppeteer from 'puppeteer-core'
import { spawn } from 'child_process'
const W = 960, H = 540, DPR = 2, FPS = 30
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function session(name, fn, opts = {}) {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: false, defaultViewport: null, ignoreDefaultArgs: ['--enable-automation'],
    args: ['--no-sandbox', '--lang=en-US', '--kiosk', '--window-position=0,0', `--window-size=${W},${H}`, `--force-device-scale-factor=${DPR}`, '--disable-infobars', '--hide-scrollbars', '--no-first-run', '--password-store=basic', '--deny-permission-prompts'] })
  const [p] = await b.pages()
  await p.setRequestInterception(true)
  p.on('request', (r) => {
    const u = r.url()
    if (u.endsWith('/api/understand')) {
      const q = JSON.parse(r.postData() || '{}').q || ''
      const body = /pharmacy/i.test(q) ? { category: 'pharmacy', km: 2, name: null } : { category: null, km: null, name: q }
      return r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    }
    if (!u.startsWith('http://localhost')) return r.abort()
    r.continue()
  })
  await p.evaluateOnNewDocument((profile) => {
    localStorage.setItem('canigo.lang', 'en')
    if (profile) localStorage.setItem('canigo.profile', JSON.stringify(profile)); else localStorage.removeItem('canigo.profile')
    const css = '.leaflet-container,.map{display:none!important} #cur{position:fixed;z-index:99999;width:22px;height:22px;margin:-3px 0 0 -3px;pointer-events:none;transition:transform .12s} #cur svg{filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))} .ripple{position:fixed;z-index:99998;width:16px;height:16px;margin:-8px;border-radius:50%;background:rgba(242,193,78,.55);pointer-events:none;animation:rp .6s ease-out forwards}@keyframes rp{to{transform:scale(4);opacity:0}}'
    addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s)
      const c = document.createElement('div'); c.id = 'cur'; c.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M3 2l7 19 2.5-7.5L20 11z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>'
      c.style.left = '600px'; c.style.top = '420px'; document.body.appendChild(c)
      addEventListener('mousemove', (e) => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px' }, true)
      addEventListener('mousedown', (e) => { c.style.transform = 'scale(.85)'; const r = document.createElement('div'); r.className = 'ripple'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 700) }, true)
      addEventListener('mouseup', () => { c.style.transform = '' }, true)
    })
  }, opts.profile || null)
  await p.goto('http://localhost:4173/', { waitUntil: 'networkidle0' })
  await sleep(600)
  let mx = 600, my = 420
  const move = async (x, y, ms = 650) => { const steps = Math.round(ms / 16); await p.mouse.move(x, y, { steps }); mx = x; my = y }
  const el = async (sel, text) => {
    const h = await p.waitForFunction((sel, text) => [...document.querySelectorAll(sel)].find((e) => e.offsetParent && (!text || e.textContent.includes(text))), { timeout: 15000 }, sel, text)
    return h.asElement()
  }
  const click = async (sel, text, pause = 350) => {
    const e = await el(sel, text); await e.evaluate((n) => n.scrollIntoView({ block: 'nearest' })); await sleep(150)
    let bx = await e.boundingBox(); await move(bx.x + Math.min(bx.width / 2, 120), bx.y + bx.height / 2)
    bx = await e.boundingBox(); await move(bx.x + Math.min(bx.width / 2, 120), bx.y + bx.height / 2, 120)
    await sleep(pause)
    await p.mouse.down(); await sleep(90); await p.mouse.up()
  }
  const type = async (sel, text) => { await click(sel); await p.keyboard.type(text, { delay: 85 }) }
  const scroll = async (dy, ms = 1200) => { const n = Math.round(ms / 16); for (let i = 0; i < n; i++) { await p.mouse.wheel({ deltaY: dy / n }); await sleep(16) } }
  await sleep(300)
  const rec = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'x11grab', '-draw_mouse', '0', '-framerate', String(FPS), '-video_size', `${W * DPR}x${H * DPR}`, '-i', process.env.DISPLAY + '.0+0,0',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-pix_fmt', 'yuv420p', `clips/${name}.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] })
  const t0 = Date.now()
  await sleep(500)
  await fn({ p, click, type, move, scroll, el, sleep })
  await sleep(500)
  rec.stdin.write('q'); await new Promise((r) => rec.on('close', r))
  await b.close()
  const frames = { length: 0 }, t1 = (Date.now() - t0) / 1000
  console.log(name, t1.toFixed(1) + 's')
}
const only = process.argv[2]
const S = {
  intro: async ({ click, type, scroll, sleep }) => {
    await sleep(1500); await scroll(260, 1400); await sleep(900)
    await click('button', 'Walker'); await sleep(1100)
    await click('button', 'Amsterdam'); await sleep(900)
    await type('input', 'Anne Frank Huis'); await sleep(300)
    await click('button', 'Check'); await sleep(3500)
  },
  ask: async ({ click, type, sleep, scroll }) => {
    await click('button', 'No city'); await sleep(900); await click('button', 'Amsterdam'); await sleep(700)
    await type('input', 'Anne Frank Huis'); await click('button', 'Check'); await sleep(2500)
    await click('summary', 'Ask them'); await sleep(1500); await scroll(220, 900); await sleep(800)
    for (const l of ['Türkçe', 'Azərbaycanca', 'Русский', 'English']) { await click('button', l, 200); await sleep(1100) }
    await sleep(800)
  },
  crutches: async ({ click, type, sleep, el }) => {
    await click('button', 'No city'); await sleep(900); await click('button', 'London'); await sleep(700)
    await type('input', 'Sixty 6'); await click('button', 'Check'); await el('h2', 'Sixty 6').catch(() => {}); await sleep(3500)
  },
  wheelchair: async ({ click, type, sleep, el }) => {
    await click('button', 'No city'); await sleep(900); await click('button', 'London'); await sleep(700)
    await type('input', 'Sixty 6'); await click('button', 'Check'); await el('h2', 'Sixty 6').catch(() => {}); await sleep(3500)
  },
  cafe: async ({ click, sleep, scroll }) => {
    await click('button', 'No city'); await sleep(900); await click('button', 'Amsterdam'); await sleep(700)
    await click('button', 'Café'); await sleep(3000); await scroll(500, 2500); await sleep(800); await scroll(900, 3500); await sleep(800); await scroll(1400, 4000); await sleep(1500)
  },
  sentence: async ({ click, type, sleep, scroll }) => {
    await click('button', 'No city'); await sleep(900); await click('button', 'Amsterdam'); await sleep(700)
    await type('input', 'find me a pharmacy within 2 km'); await sleep(300); await click('button', 'Check'); await sleep(3500); await scroll(250, 1500); await sleep(1200)
  },
  languages: async ({ p, sleep, move }) => {
    await sleep(1200)
    const sel = await p.$('select'); const bx = await sel.boundingBox(); await move(bx.x + 60, bx.y + bx.height / 2); await sleep(400)
    for (const v of ['tr', 'az', 'ru', 'en']) { await p.select('select', v); await sleep(1700) }
  }
}
const walker = { id: 'walker' }, crutches = { id: 'crutches' }, manual = { id: 'manual' }
const plan = { intro: null, ask: 'walker', crutches: 'crutches', wheelchair: 'manual', cafe: 'walker', sentence: 'walker', languages: null }
const profs = await import(new URL('../src/profiles.js', import.meta.url)).catch(() => null)
for (const [k, prof] of Object.entries(plan)) {
  if (only && only !== k) continue
  let profile = null
  if (prof && profs) profile = (profs.PROFILES || profs.default || []).find?.((x) => x.id === prof) || null
  await session(k, S[k], { profile })
}

