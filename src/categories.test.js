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

import { placesNear as overtureNear } from './sources/places.js'
describe('unchecked places', () => {
  it('lists Overture places of the right kind, nearest first', () => {
    const pack = { places: [['Far Cafe', 40.41, 49.86, 'cafe'], ['Near Cafe', 40.4001, 49.86, 'cafe'], ['Bank', 40.4, 49.86, 'bank']] }
    const out = overtureNear(pack, { lat: 40.4, lng: 49.86 }, 2000, ['cafe'])
    expect(out.map((p) => p.name)).toEqual(['Near Cafe', 'Far Cafe'])
    expect(out[0].records).toEqual([])
  })
})

import { placesByName, fold } from './sources/places.js'

describe('name search in city packs', () => {
  const names = [{ name: 'Hemingway Wine & Cocktail Bar' }, { name: 'Elmlər Akademiyası' }, { name: 'Ernest Hemingway Museum' }]
  it('finds partial names, shortest first', () => {
    expect(placesByName(names, 'hemingway').map((p) => p.name)).toEqual(['Ernest Hemingway Museum', 'Hemingway Wine & Cocktail Bar'])
  })
  it('ignores Azerbaijani letters and case', () => {
    expect(fold('Elmlər Akademiyası')).toBe('elmler akademiyasi')
    expect(placesByName(names, 'elmler akademiyasi')[0].name).toBe('Elmlər Akademiyası')
  })
  it('needs every word', () => {
    expect(placesByName(names, 'hemingway pizza')).toEqual([])
  })
})

describe('hospital category', () => {
  it('understands hospital words in four languages', () => {
    for (const w of ['hospital', 'xəstəxana', 'hastane', 'больница', 'poliklinika near me']) expect(detectCategory(w)?.id).toBe('health')
  })
  it('matches hospitals and clinics', () => {
    const health = CATEGORIES.find((c) => c.id === 'health')
    expect(inCategory({ category: 'hospital' }, health)).toBe(true)
    expect(inCategory({ category: 'clinic' }, health)).toBe(true)
    expect(inCategory({ category: 'pharmacy' }, health)).toBe(false)
  })
})
