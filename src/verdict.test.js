import { describe, it, expect } from 'vitest'
import { combine } from './verdict.js'

const r = (status, updatedAt = null, source = 'test') => ({ source, status, updatedAt })

describe('combine', () => {
  it('says unknown when no source knows anything', () => {
    expect(combine([]).status).toBe('unknown')
    expect(combine([r('unknown')]).status).toBe('unknown')
  })

  it('uses the only known record', () => {
    const out = combine([r('unknown'), r('yes')])
    expect(out.status).toBe('yes')
    expect(out.conflict).toBe(false)
  })

  it('lets the newest record win and flags the disagreement', () => {
    const out = combine([r('yes', '2023-01-01', 'osm'), r('no', '2025-06-01', 'photo')])
    expect(out.status).toBe('no')
    expect(out.headline.source).toBe('photo')
    expect(out.conflict).toBe(true)
    expect(out.others).toHaveLength(1)
  })

  it('treats a dated record as newer than an undated one', () => {
    const out = combine([r('yes', null, 'a'), r('partial', '2024-01-01', 'b')])
    expect(out.status).toBe('partial')
  })
})
