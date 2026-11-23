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

  it('lets the newest record win; an opposite record two years older is not a disagreement', () => {
    const out = combine([r('no', { updatedAt: '2024-01-26', source: 'old' }), r('yes', { updatedAt: '2026-07-27', source: 'new' })])
    expect(out.status).toBe('yes')
    expect(out.headline.source).toBe('new')
    expect(out.conflict).toBe(false)
    expect(out.older.source).toBe('old')
    expect(out.others).toHaveLength(1)
  })

  it('calls it a disagreement when opposite records are less than a year apart', () => {
    const out = forProfile([r('no', { updatedAt: '2026-02-01' }), r('yes', { updatedAt: '2026-07-27' })], wheelchair)
    expect(out.conflict).toBe(true)
    expect(out.title).toBe('Sources disagree')
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

describe('AI photo records', () => {
  const ai = { source: 'Street photo, AI estimate', status: 'yes', updatedAt: '2024-01-01', steps: 0, ai: true }
  const yes = { source: 'A', status: 'yes', updatedAt: null }
  const no = { source: 'B', status: 'no', updatedAt: null }
  it('never outranks real records or settles a disagreement', () => {
    const out = forProfile([ai, yes, no], { widthCm: 75, steps: 0 })
    expect(out.headline.ai).toBeFalsy()
    expect(out.title).toBe('Sources disagree')
  })
  it('alone gives a cautious answer, never a green one', () => {
    const out = forProfile([ai], { widthCm: 75, steps: 0 })
    expect(out.tone).toBe('partial')
    expect(out.aiOnly).toBe(true)
  })
})

describe('red answer speaks about the person', () => {
  it('says the entrance does not work for someone who cannot use steps', () => {
    const out = forProfile([{ source: 'osm', status: 'no', updatedAt: '2025-01-01' }], { id: 'walker', widthCm: 75, steps: 0 })
    expect(out.title).toBe("This entrance doesn't work for you")
  })
  it('keeps the source wording when the person can manage some steps', () => {
    const out = forProfile([{ source: 'osm', status: 'no', updatedAt: '2025-01-01' }], { id: 'crutches', widthCm: 70, steps: 2 })
    expect(out.title).toBe('Not wheelchair accessible')
  })
})

describe('counted steps within reach', () => {
  const sixty6 = [{ source: 'OpenStreetMap', status: 'no', updatedAt: '2025-10-14', steps: 2, doorWidthCm: null }]
  it('is yellow, not red, for crutches (2 steps allowed)', () => {
    const out = forProfile(sixty6, { id: 'crutches', widthCm: 70, steps: 2 })
    expect(out.tone).toBe('partial')
    expect(out.title).toBe('Probably, with some effort')
  })
  it('stays red for a wheelchair', () => {
    const out = forProfile(sixty6, { id: 'manual', widthCm: 70, steps: 0 })
    expect(out.tone).toBe('no')
    expect(out.title).toBe('Steps at the entrance')
  })
})
