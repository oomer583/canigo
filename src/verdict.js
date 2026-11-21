// Turns the records that each data source returns for one place into a single answer.
// A record looks like:
//   { source: 'accessibility.cloud', sourceUrl, status: 'yes' | 'partial' | 'no' | 'unknown',
//     detail: 'Ramp at the main entrance', updatedAt: '2025-03-01' | null }
// Disagreements are never hidden: the newest record wins the headline,
// and every other record stays visible underneath it.

export const STATUS = {
  yes: { label: 'You can get in', tone: 'yes' },
  partial: { label: 'Partly accessible', tone: 'partial' },
  no: { label: 'Steps at the entrance', tone: 'no' },
  unknown: { label: 'Not known yet', tone: 'unknown' }
}

const KNOWN = new Set(['yes', 'partial', 'no'])

function time(record) {
  const t = record.updatedAt ? Date.parse(record.updatedAt) : NaN
  return Number.isNaN(t) ? -Infinity : t
}

export function combine(records) {
  const known = records.filter((r) => KNOWN.has(r.status))
  if (known.length === 0) {
    return { status: 'unknown', headline: null, others: records, conflict: false }
  }
  const sorted = [...known].sort((a, b) => time(b) - time(a))
  const headline = sorted[0]
  const conflict = new Set(known.map((r) => r.status)).size > 1
  const others = records.filter((r) => r !== headline)
  return { status: headline.status, headline, others, conflict }
}
