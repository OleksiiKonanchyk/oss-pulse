import { Link } from 'react-router-dom'
import { useRepo } from '../../queries/use-github-queries'
import { formatCompact, formatRelativeDate } from '../../lib/format'

function CellPlaceholder({ width = 'w-12' }: { width?: string }) {
  return <div className={`h-4 ${width} animate-pulse rounded bg-slate-200 dark:bg-slate-800`} />
}

/**
 * Renders one stable <tr>/<td> subtree in every state (pending, error, resolved) so the
 * accessible-tree nodes — in particular the status live region below — are updated in
 * place rather than unmounted and recreated. A live region that already exists when its
 * text changes is reliably announced by assistive technology; one that is created at the
 * moment of the change frequently is not, because the AT never observed a transition.
 */
export function RepoRow({ fullName, onUntrack }: { fullName: string; onUntrack: () => void }) {
  const { data, isPending, isError } = useRepo(fullName)
  const failed = !isPending && (isError || !data)
  const repo = !isPending && !isError && data ? data : undefined

  const statusText = isPending ? `Loading ${fullName}` : failed ? `${fullName} is unavailable` : ''

  return (
    <tr className="border-t border-slate-200 dark:border-slate-800" aria-busy={isPending}>
      <td className="px-4 py-3">
        <span
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid={`row-status-${fullName}`}
          className="sr-only"
        >
          {statusText}
        </span>
        {isPending ? (
          <CellPlaceholder width="w-32" />
        ) : repo ? (
          <>
            <Link to={`/repo/${repo.fullName}`} className="font-medium underline-offset-4 hover:underline">
              {repo.fullName}
            </Link>
            {repo.description && (
              <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{repo.description}</p>
            )}
          </>
        ) : (
          <span className="font-medium">{fullName}</span>
        )}
      </td>
      <td className="px-4 py-3 tabular-nums">
        {isPending ? <CellPlaceholder /> : repo ? formatCompact(repo.stars) : <span className="text-slate-500">—</span>}
      </td>
      <td className="px-4 py-3 tabular-nums">
        {isPending ? <CellPlaceholder /> : repo ? formatCompact(repo.openIssues) : <span className="text-slate-500">—</span>}
      </td>
      <td className="px-4 py-3 text-sm text-slate-500">
        {isPending ? <CellPlaceholder width="w-20" /> : repo ? formatRelativeDate(repo.pushedAt) : 'unavailable'}
      </td>
      <td className="px-4 py-3 text-right">
        {repo && (
          <button
            type="button"
            onClick={onUntrack}
            aria-label={`Remove ${repo.fullName}`}
            className="text-sm text-slate-500 underline-offset-4 hover:underline"
          >
            Remove
          </button>
        )}
      </td>
    </tr>
  )
}
