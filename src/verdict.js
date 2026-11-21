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
  const others = records.filter((r) => r !== headline)
  return { status: headline.status, headline, others, conflict }
}

// Personal answer: the combined status, sharpened by the user's profile
// when the data has measurements (door width, number of steps).
export function forProfile(records, profile) {
  const base = combine(records)
  const out = { ...base, tone: base.status, title: STATUS[base.status].label, reasons: [] }
  // Sources disagree and none is dated: do not pretend to know which is right.
  if (base.headline?.ai) {
    out.tone = 'partial'
    out.title = base.status === 'no' ? 'A street photo suggests steps' : 'A street photo suggests no steps'
    out.aiOnly = true
  } else if (base.conflict && !base.headline?.updatedAt) {
    out.tone = 'partial'
    out.title = 'Sources disagree'
    out.undated = true
  }
  if (!profile) return out

  const measured = records.filter((r) => !r.ai)
  const door = measured.map((r) => r.doorWidthCm).find((v) => typeof v === 'number')
  const steps = measured.map((r) => r.steps).find((v) => typeof v === 'number')

  if (typeof door === 'number') {
    if (door < profile.widthCm) {
      out.reasons.push(`The door is ${door} cm. You need about ${profile.widthCm} cm.`)
      out.tone = 'no'
      out.title = 'You may not fit through the door'
    } else {
      out.reasons.push(`The door is ${door} cm. You need about ${profile.widthCm} cm.`)
    }
  }
  if (typeof steps === 'number') {
    if (steps > profile.steps) {
      out.reasons.push(`${steps} step${steps > 1 ? 's' : ''} at the entrance.`)
      out.tone = 'no'
      out.title = 'Steps at the entrance'
    } else if (steps > 0) {
      out.reasons.push(`${steps} step${steps > 1 ? 's' : ''} at the entrance. You said you can manage that.`)
      if (out.tone !== 'no') {
        out.tone = 'yes'
        out.title = 'You can get in'
      }
    }
  }
  if (base.status === 'partial' && profile.steps > 0 && out.tone === 'partial') {
    out.title = 'Probably, with some effort'
  }
  return out
}
