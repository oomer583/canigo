import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { DICT, UI_LANGS, detectLang, setLanguage, t } from './i18n.js'
import { PROFILES } from './profiles.js'
import { CATEGORIES } from './categories.js'
import { STATUS } from './verdict.js'
import { askText } from './ask.js'

// Every sentence the app shows: t('...') calls in the UI, verdict titles and reasons, labels.
function usedKeys() {
  const keys = new Set()
  for (const file of ['src/App.jsx', 'src/verdict.js']) {
    const src = readFileSync(file, 'utf8')
    for (const m of src.matchAll(/t\(\s*(['"])((?:\\.|(?!\1).)*)\1/g)) keys.add(m[2].replace(/\\(['"])/g, '$1'))
    for (const m of src.matchAll(/key:\s*(?:steps === 1 \? )?'([^']+)'(?: : '([^']+)')?/g)) [m[1], m[2]].filter(Boolean).forEach((k) => keys.add(k))
  }
  PROFILES.forEach((p) => keys.add(p.label))
  CATEGORIES.forEach((c) => keys.add(c.label))
  Object.values(STATUS).forEach((s) => keys.add(s.label))
  ;['A street photo suggests steps', 'A street photo suggests no steps', 'Sources disagree', 'You may not fit through the door', 'Steps at the entrance', 'Probably, with some effort',
    'Volunteer, not verified', 'Street photo, AI estimate', 'you could get in', 'you could not get in', 'it was partly accessible'].forEach((k) => keys.add(k))
  return [...keys].filter((k) => !k.startsWith('{') || k.includes(' '))
}

const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')

describe('translations', () => {
  const keys = usedKeys()
  for (const { id } of UI_LANGS.filter((l) => l.id !== 'en')) {
    it(`${id} has every sentence the app shows`, () => {
      const missing = keys.filter((k) => !DICT[id][k])
      expect(missing).toEqual([])
    })
    it(`${id} keeps the same {placeholders}`, () => {
      const wrong = Object.entries(DICT[id]).filter(([k, v]) => placeholders(k.replace(' (count)', '')) !== placeholders(v)).map(([k]) => k)
      expect(wrong).toEqual([])
    })
  }
  it('picks the browser language, a saved choice, or English', () => {
    expect(detectLang(null, ['tr-TR', 'en'])).toBe('tr')
    expect(detectLang(null, ['nl-NL', 'ru'])).toBe('ru')
    expect(detectLang(null, ['nl-NL'])).toBe('en')
    expect(detectLang('az', ['tr-TR'])).toBe('az')
    expect(detectLang('xx', [])).toBe('en')
  })
  it('fills in values and falls back to English', () => {
    setLanguage('tr')
    expect(t('Look up to {km} km', { km: 6 })).toBe('6 km içinde ara')
    expect(t('Some sentence nobody translated')).toBe('Some sentence nobody translated')
    setLanguage('en')
    expect(t('Steps at the entrance (count)')).toBe('Steps at the entrance')
  })
  it('writes the ask message in Turkish', () => {
    expect(askText(PROFILES.find((p) => p.id === 'walker'), 'Galata Kulesi', 'tr')).toMatch(/^Merhaba\. Galata Kulesi adresine.*Yürüteç kullanıyorum.*75 cm/)
  })
})
