export function formatCompact(value: number): string {
  if (value < 1000) return String(value)
  // Compare the rounded magnitude, not the raw value: 999999 / 1000 = 999.999, which
  // toFixed(1) rounds up to "1000.0" — that must become "1M", not "1000k".
  if (value / 1000 < 999.95) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`

  return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
}

export function formatRelativeDate(date: Date): string {
  const days = Math.round((Date.now() - date.getTime()) / 86_400_000)

  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  if (days < 365) return `${Math.round(days / 30)} months ago`

  return `${Math.round(days / 365)} years ago`
}

/** Charts describe themselves in prose for screen readers; "across 1 weeks" undoes that. */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}
