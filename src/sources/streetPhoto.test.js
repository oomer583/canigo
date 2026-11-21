import { describe, it, expect } from 'vitest'
import { recordFromPhoto } from './streetPhoto.js'
import { parseAnswer } from '../../functions/api/entrance.js'

const photo = { page: 'https://www.mapillary.com/app/?pKey=1', capturedAt: '2025-04-01T00:00:00.000Z' }

describe('parseAnswer', () => {
  it('reads the three-line format', () => {
    expect(parseAnswer('STEPS: yes\nRAMP: no\nNOTE: Two steps up to a glass door.')).toEqual({ door: 'unclear', steps: 'yes', ramp: 'no', note: 'Two steps up to a glass door.' })
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

describe('door visibility', () => {
  it('ignores steps and ramp when no door is visible', () => {
    const a = parseAnswer('DOOR: no\nSTEPS: no\nRAMP: no\nNOTE: People walking on a square.')
    expect(a).toMatchObject({ door: 'no', steps: 'unclear', ramp: 'unclear' })
    expect(recordFromPhoto({ photo: { page: 'p', capturedAt: '2024-01-01' }, ai: a })).toBeNull()
  })
  it('reads a visible door', () => {
    expect(parseAnswer('DOOR: yes\nSTEPS: yes\nRAMP: no\nNOTE: Three steps.')).toMatchObject({ door: 'yes', steps: 'yes', ramp: 'no' })
  })
})
