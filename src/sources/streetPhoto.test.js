import { describe, it, expect } from 'vitest'
import { recordFromPhoto } from './streetPhoto.js'
import { parseAnswer } from '../../functions/api/entrance.js'

const photo = { page: 'https://www.mapillary.com/app/?pKey=1', capturedAt: '2025-04-01T00:00:00.000Z' }

describe('parseAnswer', () => {
  it('reads the three-line format', () => {
    expect(parseAnswer('STEPS: yes\nRAMP: no\nNOTE: Two steps up to a glass door.')).toEqual({ steps: 'yes', ramp: 'no', note: 'Two steps up to a glass door.' })
  })
  it('falls back to unclear', () => {
    expect(parseAnswer('I cannot tell.').steps).toBe('unclear')
  })
})

describe('recordFromPhoto', () => {
  it('turns visible steps into a no', () => {
    expect(recordFromPhoto({ photo, ai: { steps: 'yes', ramp: 'no', note: 'x' } }).status).toBe('no')
  })
  it('turns a ramp into a yes', () => {
    expect(recordFromPhoto({ photo, ai: { steps: 'yes', ramp: 'yes', note: 'x' } }).status).toBe('yes')
  })
  it('stays silent when the model is unsure', () => {
    expect(recordFromPhoto({ photo, ai: { steps: 'unclear', ramp: 'unclear' } })).toBe(null)
  })
})
