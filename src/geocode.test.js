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
