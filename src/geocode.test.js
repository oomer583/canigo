import { describe, it, expect } from 'vitest'
import { queryVariants } from './geocode.js'

describe('queryVariants', () => {
  it('tries shorter versions of long names', () => {
    expect(queryVariants('Milli İdman Tibb və Reabilitasiya İnstitutu')).toEqual([
      'Milli İdman Tibb və Reabilitasiya İnstitutu',
      'İdman Tibb və Reabilitasiya İnstitutu',
      'Milli İdman Tibb və Reabilitasiya',
      'İdman Tibb və Reabilitasiya'
    ])
  })
  it('keeps short queries as they are', () => {
    expect(queryVariants('Rijksmuseum')).toEqual(['Rijksmuseum'])
  })
})

import { withoutCity, inBox } from './geocode.js'

describe('chosen city wins', () => {
  const baku = [49.65, 40.3, 50.1, 40.55]
  it('drops the city name from the query', () => {
    expect(withoutCity('Hemingway Baku', 'Baku')).toBe('Hemingway')
    expect(withoutCity('Rijksmuseum, Amsterdam', 'Amsterdam')).toBe('Rijksmuseum')
    expect(withoutCity('Bakuhan', 'Baku')).toBe('Bakuhan')
    expect(withoutCity('Baku', 'Baku')).toBe('Baku')
  })
  it('rejects places outside the city', () => {
    expect(inBox(baku, 35.32, -119.1)).toBe(false) // Bakersfield, California
    expect(inBox(baku, 40.41, 49.87)).toBe(true)
    expect(inBox(null, 35.32, -119.1)).toBe(true)
  })
})

import { looksLikeName } from './geocode.js'

describe('fuzzy results must look like the name typed', () => {
  it('drops unrelated typo matches', () => {
    expect(looksLikeName('Frans van Mierisstraat', 'Mitri')).toBe(false)
  })
  it('keeps real matches, including partial words', () => {
    expect(looksLikeName('ITRDI (Idman Tibbi Reabilitasiya Diaqnostika İnstitutu)', 'İdman Tibb və Reabilitasiya')).toBe(true)
    expect(looksLikeName('Rijksmuseum', 'rijksmuseum')).toBe(true)
    expect(looksLikeName('Anne Frank Huis', 'Anne Frank')).toBe(true)
    expect(looksLikeName('Café De Wasserette', 'wasserette')).toBe(true)
  })
})
