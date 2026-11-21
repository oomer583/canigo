import { describe, it, expect } from 'vitest'
import { combine, forProfile } from './verdict.js'

const r = (status, extra = {}) => ({ source: 'test', status, updatedAt: null, doorWidthCm: null, steps: null, ...extra })
const wheelchair = { id: 'manual', label: 'Manual wheelchair', widthCm: 70, steps: 0 }
const stroller = { id: 'stroller', label: 'Stroller', widthCm: 65, steps: 1 }

describe('combine', () => {
  it('says unknown when no source knows anything', () => {
    expect(combine([]).status).toBe('unknown')
    expect(combine([r('unknown')]).status).toBe('unknown')
  })

  it('lets the newest record win and flags the disagreement', () => {
    const out = combine([r('yes', { updatedAt: '2023-01-01', source: 'osm' }), r('no', { updatedAt: '2025-06-01', source: 'photo' })])
    expect(out.status).toBe('no')
    expect(out.headline.source).toBe('photo')
    expect(out.conflict).toBe(true)
    expect(out.others).toHaveLength(1)
  })
})

describe('forProfile', () => {
  it('warns when the door is narrower than the user needs', () => {
    const out = forProfile([r('yes', { doorWidthCm: 65 })], wheelchair)
    expect(out.tone).toBe('no')
    expect(out.title).toMatch(/fit/)
  })

  it('accepts a wide enough door', () => {
    const out = forProfile([r('yes', { doorWidthCm: 85 })], wheelchair)
    expect(out.tone).toBe('yes')
  })

  it('lets a stroller manage one step but not a wheelchair', () => {
    const records = [r('partial', { steps: 1 })]
    expect(forProfile(records, stroller).tone).toBe('yes')
    expect(forProfile(records, wheelchair).tone).toBe('no')
  })

  it('says sources disagree when they conflict and none is dated', () => {
    const out = forProfile([r('yes'), r('no')], wheelchair)
    expect(out.tone).toBe('partial')
    expect(out.title).toBe('Sources disagree')
  })
})
