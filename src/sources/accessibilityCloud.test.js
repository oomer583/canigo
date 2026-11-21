import { describe, it, expect } from 'vitest'
import { normalizeFeature, statusFromA11y } from './accessibilityCloud.js'

describe('statusFromA11y', () => {
  it('reads the A11yJSON wheelchair flags', () => {
    expect(statusFromA11y({ accessibleWith: { wheelchair: true } })).toBe('yes')
    expect(statusFromA11y({ accessibleWith: { wheelchair: false }, partiallyAccessibleWith: { wheelchair: true } })).toBe('partial')
    expect(statusFromA11y({ accessibleWith: { wheelchair: false } })).toBe('no')
    expect(statusFromA11y({})).toBe('unknown')
  })
})

describe('normalizeFeature', () => {
  it('turns a GeoJSON feature into a place with one record', () => {
    const place = normalizeFeature({
      geometry: { type: 'Point', coordinates: [4.89, 52.37] },
      properties: {
        name: { en: 'Corner Cafe' },
        category: 'cafe',
        accessibility: { accessibleWith: { wheelchair: false }, entrances: [{ stairs: { count: 2 } }] }
      }
    })
    expect(place.name).toBe('Corner Cafe')
    expect(place.lat).toBe(52.37)
    expect(place.lng).toBe(4.89)
    expect(place.record.status).toBe('no')
    expect(place.record.detail).toBe('2 steps at the entrance')
  })
})
