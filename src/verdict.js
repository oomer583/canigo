// Turns what the sources know about one place into one answer for one person.
// A record: { source, sourceUrl, status: 'yes'|'partial'|'no'|'unknown',
//             detail, updatedAt, doorWidthCm: number|null, steps: number|null }
// Disagreements are never hidden: the newest record leads, the others stay visible.

export const STATUS = {
  yes: { label: 'You can get in', tone: 'yes' },
  partial: { label: 'Partly accessible', tone: 'partial' },
  no: { label: 'Not wheelchair accessible', tone: 'no' },
  unknown: { label: 'Not known yet', tone: 'unknown' }
}

const KNOWN = new Set(['yes', 'partial', 'no'])
const YEAR = 365 * 24 * 3600 * 1000

function time(record) {
  const t = record.updatedAt ? Date.parse(record.updatedAt) : NaN
  return Number.isNaN(t) ? -Infinity : t
}

// AI guesses from a street photo are supporting evidence only: they never
// outrank a real record and never create or settle a disagreement.
export function combine(records) {
  const allKnown = records.filter((r) => KNOWN.has(r.status))
  const real = allKnown.filter((r) => !r.ai)
  const known = real.length ? real : allKnown
  if (known.length === 0) {
    return { status: 'unknown', headline: null, others: records, conflict: false }
  }
  const sorted = [...known].sort((a, b) => time(b) - time(a))
  const headline = sorted[0]
  const conflict = new Set(known.map((r) => r.status)).size > 1
  // A disagreement only counts as real when the opposite record is about as recent (within a year)
  // or undated. An older opposite record just means the place has probably changed since.
  const opposite = known.filter((r) => r.status !== headline.status)
  const close = opposite.some((r) => time(r) === -Infinity || time(headline) === -Infinity || time(headline) - time(r) < YEAR)
  const older = opposite.length && !close ? opposite.sort((a, b) => time(b) - time(a))[0] : null
  const others = records.filter((r) => r !== headline)
  return { status: headline.status, headline, others, conflict: conflict && close, older }
}

// Personal answer: the combined status, sharpened by the user's profile
// when the data has measurements (door width, number of steps).
export function forProfile(records, profile) {
  const base = combine(records)
  const out = { ...base, tone: base.status, title: STATUS[base.status].label, reasons: [] }
  // Sources disagree at about the same time (or undated): do not pretend to know which is right.
  if (base.headline?.ai) {
    out.tone = 'partial'
    out.title = base.status === 'no' ? 'A street photo suggests steps' : 'A street photo suggests no steps'
    out.aiOnly = true
  } else if (base.conflict) {
    out.tone = 'partial'
    out.title = 'Sources disagree'
    out.undated = true
  }
  if (!profile) return out
  // "Not wheelchair accessible" is the source's wording. For anyone who can't use steps, say it about them.
  if (out.tone === 'no' && base.status === 'no' && profile.steps === 0) out.title = "This entrance doesn't work for you"

  const measured = records.filter((r) => !r.ai)
  const door = measured.map((r) => r.doorWidthCm).find((v) => typeof v === 'number')
  const steps = measured.map((r) => r.steps).find((v) => typeof v === 'number')

  if (typeof door === 'number') {
    if (door < profile.widthCm) {
      out.reasons.push({ key: 'The door is {door} cm. You need about {need} cm.', vars: { door, need: profile.widthCm } })
      out.tone = 'no'
      out.title = 'You may not fit through the door'
    } else {
      out.reasons.push({ key: 'The door is {door} cm. You need about {need} cm.', vars: { door, need: profile.widthCm } })
    }
  }
  if (typeof steps === 'number') {
    if (steps > profile.steps) {
      out.reasons.push({ key: steps === 1 ? '1 step at the entrance.' : '{n} steps at the entrance.', vars: { n: steps } })
      out.tone = 'no'
      out.title = 'Steps at the entrance'
    } else if (steps > 0) {
      out.reasons.push({ key: steps === 1 ? '1 step at the entrance. You said you can manage that.' : '{n} steps at the entrance. You said you can manage that.', vars: { n: steps } })
      if (out.tone !== 'no') {
        out.tone = 'yes'
        out.title = 'You can get in'
      } else if (out.title !== 'You may not fit through the door') {
        // The source says "not wheelchair accessible", but the steps it counted are within what this person
        // can manage. Not green: the "no" may have another reason. Not red either: that would contradict the line above.
        out.tone = 'partial'
        out.title = 'Probably, with some effort'
      }
    }
  }
  if (base.status === 'partial' && profile.steps > 0 && out.tone === 'partial') {
    out.title = 'Probably, with some effort'
  }
  // A red or yellow answer must always say why. When the source gives no measurements and no
  // description, say exactly that, instead of leaving a bare colour.
  const h = base.headline
  if (out.reasons.length === 0 && h && !h.ai && !h.detail && !out.conflict) {
    if (base.status === 'no') out.reasons.push({ key: '{source} marks this entrance as not accessible but does not say why. No step count or door width is recorded.', vars: { source: h.source } })
    else if (base.status === 'partial') out.reasons.push({ key: '{source} marks this entrance as partly accessible but does not say what that means. No step count or door width is recorded.', vars: { source: h.source } })
  }
  return out
}
