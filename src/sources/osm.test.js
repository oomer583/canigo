import { describe, it, expect } from 'vitest'
import { parseOverpass, entranceFromTags } from './osm.js'

describe('entranceFromTags', () => {
  it('reads door width and steps', () => {
    const e = entranceFromTags({ entrance: 'main', 'door:width': '0.8', step_count: '2' })
    expect(e.doorWidthCm).toBe(80)
    expect(e.steps).toBe(2)
    expect(e.main).toBe(true)
  })
  it('notices a ramp', () => {
    expect(entranceFromTags({ entrance: 'yes', ramp: 'yes' }).detail).toBe('Ramp at the entrance')
  })
})

describe('parseOverpass', () => {
  it('separates places from entrances and keeps edit dates', () => {
    const { places, entrances } = parseOverpass([
      { type: 'node', id: 1, lat: 52.37, lon: 4.89, timestamp: '2024-05-01T10:00:00Z', tags: { name: 'Cafe Test', amenity: 'cafe', wheelchair: 'limited' } },
      { type: 'node', id: 2, lat: 52.3701, lon: 4.8901, timestamp: '2025-02-01T10:00:00Z', tags: { entrance: 'main', 'door:width': '90 cm' } },
      { type: 'way', id: 3, center: { lat: 52.371, lon: 4.891 }, tags: { building: 'yes' } }
    ])
    expect(places).toHaveLength(1)
    expect(places[0].record.status).toBe('partial')
    expect(places[0].record.updatedAt).toBe('2024-05-01T10:00:00.000Z')
    expect(places[0].record.sourceUrl).toBe('https://www.openstreetmap.org/node/1')
    expect(entrances).toHaveLength(1)
    expect(entrances[0].doorWidthCm).toBe(90)
  })
})
