import { Link } from 'react-router-dom'
import { useRepo } from '../../queries/use-github-queries'
import { formatCompact, formatRelativeDate } from '../../lib/format'

export function RepoRow({ fullName, onUntrack }: { fullName: string; onUntrack: () => void }) {
  const { data, isPending, isError } = useRepo(fullName)

  if (isPending) {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-3">
          <div className="h-5 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        </td>
      </tr>
    )
  }

  if (isError || !data) {
    return (
      <tr>
        <td className="px-4 py-3 font-medium">{fullName}</td>
        <td colSpan={4} className="px-4 py-3 text-sm text-slate-500">
          unavailable
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-t border-slate-200 dark:border-slate-800">
      <td className="px-4 py-3">
        <Link to={`/repo/${data.fullName}`} className="font-medium underline-offset-4 hover:underline">
          {data.fullName}
        </Link>
        {data.description && (
          <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{data.description}</p>
        )}
      </td>
      <td className="px-4 py-3 tabular-nums">{formatCompact(data.stars)}</td>
      <td className="px-4 py-3 tabular-nums">{formatCompact(data.openIssues)}</td>
      <td className="px-4 py-3 text-sm text-slate-500">{formatRelativeDate(data.pushedAt)}</td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={onUntrack}
          className="text-sm text-slate-500 underline-offset-4 hover:underline"
        >
          Remove<span className="sr-only"> {data.fullName} row</span>
        </button>
      </td>
    </tr>
  )
}
