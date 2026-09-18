export function formatCompact(value: number): string {
  if (value < 1000) return String(value)
  if (value < 1_000_000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`

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
