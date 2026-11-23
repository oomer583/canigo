import { describe, it, expect } from 'vitest'
import { looksLikeSentence } from './understand.js'
import { readIntent } from '../functions/api/understand.js'

describe('looksLikeSentence', () => {
  it('leaves names and single words to the normal search', () => {
    expect(looksLikeSentence('Rijksmuseum')).toBe(false)
    expect(looksLikeSentence('Hemingway Baku')).toBe(false)
    expect(looksLikeSentence('Sixty 6')).toBe(false)
    expect(looksLikeSentence('Studio 54')).toBe(false)
  })
  it('sends sentences, distances and questions to AI', () => {
    expect(looksLikeSentence('pharmacy within 2 km')).toBe(true)
    expect(looksLikeSentence('где поесть рядом')).toBe(true)
    expect(looksLikeSentence('toilet?')).toBe(true)
    expect(looksLikeSentence('cafe 2km')).toBe(true)
    expect(looksLikeSentence('aptek 500 m')).toBe(true)
  })
})

describe('readIntent (what we keep from the model)', () => {
  it('reads a category and a distance', () => {
    expect(readIntent('{"category":"pharmacy","km":2,"name":null}')).toEqual({ category: 'pharmacy', km: 2, name: null })
  })
  it('finds the JSON inside extra text', () => {
    expect(readIntent('Sure! {"category":"coffee","km":null,"name":null}')).toEqual({ category: 'coffee', km: null, name: null })
  })
  it('drops categories the app does not have and caps the distance', () => {
    expect(readIntent('{"category":"casino","km":null,"name":null}')).toBeNull()
    expect(readIntent('{"category":"food","km":500,"name":null}').km).toBe(25)
  })
  it('prefers a named place over a category', () => {
    expect(readIntent('{"category":"museum","km":null,"name":"Rijksmuseum"}')).toEqual({ category: null, km: null, name: 'Rijksmuseum' })
  })
  it('returns null for junk', () => {
    expect(readIntent('I cannot help with that')).toBeNull()
    expect(readIntent('{broken')).toBeNull()
  })
})
