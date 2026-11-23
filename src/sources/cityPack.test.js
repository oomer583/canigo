import { describe, it, expect } from 'vitest'
import { packNear, inside } from './cityPack.js'
import { toElement, centre } from '../../scripts/build-pack.mjs'

describe('city packs', () => {
  it('turns an osmium feature into an Overpass-style element', () => {
    const el = toElement({
      geometry: { type: 'Polygon', coordinates: [[[4.0, 52.0], [4.002, 52.0], [4.002, 52.002], [4.0, 52.002]]] },
      properties: { '@type': 'way', '@id': 7, '@timestamp': '2024-05-01T00:00:00Z', name: 'Cafe X', wheelchair: 'yes', building: 'yes' }
    })
    expect(el.type).toBe('way')
    expect(el.center.lat).toBeCloseTo(52.001, 3)
    expect(el.tags).toEqual({ name: 'Cafe X', wheelchair: 'yes' })
  })

  it('drops features with nothing about access', () => {
    expect(toElement({ geometry: { type: 'Point', coordinates: [4, 52] }, properties: { name: 'Shop' } })).toBeNull()
  })

  it('finds places and entrances near a point', () => {
    const pack = {
      elements: [
        { type: 'node', id: 1, lat: 52.0, lon: 4.0, tags: { name: 'Museum', wheelchair: 'no' }, timestamp: '2023-01-01' },
        { type: 'node', id: 2, lat: 52.0001, lon: 4.0, tags: { entrance: 'main', 'door:width': '0.9' }, timestamp: '2024-01-01' },
        { type: 'node', id: 3, lat: 52.1, lon: 4.0, tags: { name: 'Far away', wheelchair: 'yes' } }
      ]
    }
    const { places, entrances } = packNear(pack, 52.0, 4.0, 60)
    expect(places.map((p) => p.name)).toEqual(['Museum'])
    expect(entrances[0].doorWidthCm).toBe(90)
  })

  it('knows whether a point is in the city', () => {
    const city = { bbox: [4.72, 52.27, 5.08, 52.43] }
    expect(inside(city, 52.37, 4.89)).toBe(true)
    expect(inside(city, 40.4, 49.8)).toBe(false)
    expect(centre({ coordinates: [4, 52] })).toEqual({ lat: 52, lon: 4 })
  })
})

describe('timestamps', () => {
  it('turns osmium epoch seconds into ISO dates', () => {
    const pack = { elements: [{ type: 'node', id: 1, lat: 52, lon: 4, tags: { name: 'A', wheelchair: 'yes' }, timestamp: 1714521600 }] }
    expect(packNear(pack, 52, 4).places[0].record.updatedAt).toBe('2024-05-01T00:00:00.000Z')
  })
})

import { toElement as packElement } from '../../scripts/build-pack.mjs'

describe('pack builder skips things that are not places', () => {
  const f = (props) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [4.886, 52.361] }, properties: { '@type': 'node', '@id': 1, ...props } })
  it('drops the Rijksmuseum tram stop', () => {
    expect(packElement(f({ name: 'Rijksmuseum', railway: 'tram_stop', public_transport: 'stop_position', wheelchair: 'no' }))).toBeNull()
  })
  it('drops bus stops and car parks', () => {
    expect(packElement(f({ name: 'Rijksmuseum', highway: 'bus_stop', wheelchair: 'yes' }))).toBeNull()
    expect(packElement(f({ name: 'Q-Park', amenity: 'parking', wheelchair: 'yes' }))).toBeNull()
  })
  it('keeps the museum and its entrances', () => {
    expect(packElement(f({ name: 'Rijksmuseum', tourism: 'museum', wheelchair: 'yes' }))).not.toBeNull()
    expect(packElement(f({ entrance: 'main', wheelchair: 'yes' }))).not.toBeNull()
    expect(packElement(f({ name: 'Toilet', amenity: 'toilets', wheelchair: 'yes' }))).not.toBeNull()
  })
})
