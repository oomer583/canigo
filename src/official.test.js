import { describe, it, expect } from 'vitest'
import { isOfficial } from './official.js'

describe('isOfficial', () => {
  it('accepts the official addresses and local development', () => {
    expect(isOfficial('canigo-app.pages.dev')).toBe(true)
    expect(isOfficial('canigo-three.vercel.app')).toBe(true)
    expect(isOfficial('3f2a1b.canigo-app.pages.dev')).toBe(true)
    expect(isOfficial('localhost')).toBe(true)
  })

  it('flags copies, including look-alike names', () => {
    expect(isOfficial('canigo-seven.vercel.app')).toBe(false)
    expect(isOfficial('canlgo-app.pages.dev')).toBe(false)
    expect(isOfficial('canigo-app.pages.dev.evil.com')).toBe(false)
    expect(isOfficial('xn--cango-app-pages-dev')).toBe(false)
  })
})
