import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CommitWeek } from '../../api/types'

type Props = { weeks: CommitWeek[] | 'computing' }

export function CommitActivityChart({ weeks }: Props) {
  if (weeks === 'computing') {
    return (
      <p className="text-sm text-slate-500">
        GitHub is still computing statistics for this repository. Check back shortly.
      </p>
    )
  }

  if (weeks.length === 0) {
    return <p className="text-sm text-slate-500">No commit activity in the last year.</p>
  }

  const total = weeks.reduce((sum, week) => sum + week.total, 0)
  const data = weeks.map((week) => ({
    label: week.weekStart.toISOString().slice(0, 10),
    commits: week.total,
  }))

  return (
    <figure
      role="img"
      aria-label={`Commit activity: ${total} commits across ${weeks.length} weeks.`}
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <XAxis dataKey="label" hide />
          <YAxis width={32} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="commits" fill="currentColor" className="text-sky-600 dark:text-sky-400" />
        </BarChart>
      </ResponsiveContainer>
    </figure>
  )
}
