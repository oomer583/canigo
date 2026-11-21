import { describe, it, expect } from 'vitest'
import { detectCategory, inCategory, CATEGORIES } from './categories.js'
import { askText } from './ask.js'
import { rankPlaces } from './nearby.js'

describe('categories', () => {
  it('understands a need in several languages', () => {
    expect(detectCategory('coffee').id).toBe('coffee')
    expect(detectCategory('Kofe').id).toBe('coffee')
    expect(detectCategory('аптека').id).toBe('pharmacy')
    expect(detectCategory('coffee near me').id).toBe('coffee')
    expect(detectCategory('Rijksmuseum')).toBeNull()
  })
  it('matches OSM categories', () => {
    expect(inCategory({ category: 'cafe' }, CATEGORIES[0])).toBe(true)
    expect(inCategory({ category: 'bank' }, CATEGORIES[0])).toBe(false)
    expect(inCategory({ category: 'cafe', shop: 'cannabis', name: 'X' }, CATEGORIES[0])).toBe(false)
    expect(inCategory({ category: 'coffeeshop', name: 'Y' }, CATEGORIES[0])).toBe(false)
    expect(inCategory({ category: 'cafe', name: 'Coffeeshop Rock-it' }, CATEGORIES[0])).toBe(false)
  })
  it('puts places you can enter first, then nearest', () => {
    const at = { lat: 52, lng: 4 }
    const profile = { widthCm: 75, steps: 0 }
    const ranked = rankPlaces([
      { id: 'a', name: 'Near, no', lat: 52.0001, lng: 4, records: [{ status: 'no', updatedAt: null }] },
      { id: 'b', name: 'Far, yes', lat: 52.005, lng: 4, records: [{ status: 'yes', updatedAt: null }] },
      { id: 'c', name: 'Close, yes', lat: 52.001, lng: 4, records: [{ status: 'yes', updatedAt: null }] }
    ], at, profile)
    expect(ranked.map((r) => r.id)).toEqual(['c', 'b', 'a'])
  })
})

describe('ask messages', () => {
  const walker = { id: 'walker', widthCm: 75, steps: 0 }
  it('writes in Azerbaijani and Russian', () => {
    expect(askText(walker, 'Mitri', 'az')).toMatch(/^Salam\. Mitri/)
    expect(askText(walker, 'Mitri', 'ru')).toMatch(/^Здравствуйте/)
    expect(askText(walker, 'Mitri', 'en')).toMatch(/75 cm/)
  })
})
