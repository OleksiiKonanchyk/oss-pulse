import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Issue } from '../../api/types'
import { pluralize } from '../../lib/format'

function weekKey(date: Date): string {
  const monday = new Date(date)
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7))

  return monday.toISOString().slice(0, 10)
}

export function IssueThroughputChart({ issues }: { issues: Issue[] }) {
  if (issues.length === 0) {
    return <p className="text-sm text-slate-500">No issues to chart.</p>
  }

  const counts = new Map<string, number>()
  for (const issue of issues) {
    const key = weekKey(issue.createdAt)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const data = [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, opened]) => ({ label, opened }))

  return (
    <figure
      role="img"
      aria-label={`Issues on this page by week opened: ${pluralize(issues.length, 'issue')} across ${pluralize(data.length, 'week')}.`}
    >
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis width={32} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="opened"
            stroke="currentColor"
            className="text-violet-600 dark:text-violet-400"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  )
}
