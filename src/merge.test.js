import { describe, it, expect } from 'vitest'
import { mergePlaces } from './merge.js'

const place = (name, lat, lng, status) => ({ id: name, name, lat, lng, record: { source: name, status } })

describe('mergePlaces', () => {
  it('merges the same shop listed twice by different sources', () => {
    const groups = mergePlaces([
      place('Madame Tussauds', 52.3728, 4.8936, 'no'),
      place('Madame Tussauds Amsterdam', 52.3729, 4.8937, 'yes'),
      place('Peek & Cloppenburg', 52.3726, 4.8940, 'yes')
    ])
    expect(groups).toHaveLength(2)
    const mt = groups.find((g) => g.name === 'Madame Tussauds')
    expect(mt.records.map((r) => r.status).sort()).toEqual(['no', 'yes'])
  })

  it('keeps places with the same name far apart separate', () => {
    const groups = mergePlaces([place('Albert Heijn', 52.37, 4.89, 'yes'), place('Albert Heijn', 52.38, 4.90, 'no')])
    expect(groups).toHaveLength(2)
  })
})

import { dedupeRecords } from './merge.js'

describe('dedupeRecords', () => {
  const osm = { source: 'OpenStreetMap', status: 'no', updatedAt: '2025-12-23' }
  const mirror = { source: 'Wheelmap OSM Mirror (via accessibility.cloud)', status: 'no', updatedAt: null }
  it('collapses the same record listed twice', () => {
    expect(dedupeRecords([osm, { ...osm }])).toHaveLength(1)
  })
  it('drops the OSM mirror when OpenStreetMap says the same', () => {
    expect(dedupeRecords([mirror, osm, { ...mirror }])).toEqual([osm])
  })
  it('keeps the mirror only when OSM itself is missing', () => {
    expect(dedupeRecords([mirror])).toHaveLength(1)
    expect(dedupeRecords([osm, { ...mirror, status: 'yes' }])).toEqual([osm])
  })
})
