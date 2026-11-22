import { describe, it, expect } from 'vitest'
import { recordFromVolunteer } from './volunteer.js'
import { validate } from '../../functions/api/contrib.js'
import { forProfile } from '../verdict.js'

describe('volunteer reports', () => {
  it('turns steps and ramp into a status', () => {
    expect(recordFromVolunteer({ steps: 3, ramp: 'no', createdAt: '2026-11-22' }).status).toBe('no')
    expect(recordFromVolunteer({ steps: 0, ramp: 'unknown', createdAt: '2026-11-22' }).status).toBe('yes')
    expect(recordFromVolunteer({ steps: 2, ramp: 'yes', createdAt: '2026-11-22' }).status).toBe('yes')
    expect(recordFromVolunteer({ steps: null, ramp: 'unknown', doorCm: 80, createdAt: '2026-11-22' }).status).toBe('unknown')
  })
  it('steps from a volunteer count for the profile', () => {
    const rec = recordFromVolunteer({ id: 1, steps: 3, ramp: 'no', createdAt: '2026-11-22' })
    expect(forProfile([rec], { widthCm: 75, steps: 0 }).title).toBe('Steps at the entrance')
  })
  it('validates input on the server', () => {
    expect(validate({ name: 'ITRDI', lat: 40.4, lng: 49.85, steps: 3, ramp: 'no' }).value.steps).toBe(3)
    expect(validate({ name: 'X', lat: 40, lng: 49, steps: 99 }).error).toBeTruthy()
    expect(validate({ name: 'X', lat: 40, lng: 49 }).error).toBeTruthy()
    expect(validate({ name: '<b>Shop</b>', lat: 40, lng: 49, ramp: 'yes' }).value.name).toBe('bShop/b')
    expect(validate({ name: 'X', lat: 40, lng: 49, doorCm: 10 }).error).toBeTruthy()
  })
})
