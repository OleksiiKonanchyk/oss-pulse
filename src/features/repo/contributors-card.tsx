import { Card } from '../../components/card'
import { EmptyState } from '../../components/empty-state'
import { ErrorState } from '../../components/error-state'
import { Skeleton } from '../../components/skeleton'
import { formatCompact } from '../../lib/format'
import { useContributors } from '../../queries/use-github-queries'

/**
 * Renders one stable <Card> subtree in every state (pending, error, resolved) so the
 * role="status" live region inside it is updated in place rather than unmounted and
 * recreated — see RepoRow for the same reasoning. A live region that already exists when
 * its text changes is reliably announced by assistive technology; one that is created at
 * the moment of the change frequently is not.
 */
export function ContributorsCard({ fullName }: { fullName: string }) {
  const { data, isPending, isError, error, refetch } = useContributors(fullName)

  const statusText = isPending
    ? 'Loading contributors'
    : isError
      ? 'Contributors failed to load'
      : ''

  return (
    <Card title="Top contributors">
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusText}
      </span>

      {isPending ? (
        <Skeleton rows={5} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data.length === 0 ? (
        <EmptyState
          title="No contributors yet"
          description="GitHub lists no contributors for this repository."
        />
      ) : (
        <ul className="space-y-3">
          {data.map((contributor) => (
            <li key={contributor.login} className="flex items-center gap-3">
              <img
                src={contributor.avatarUrl}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 rounded-full"
              />
              <a
                href={contributor.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 truncate font-medium underline-offset-4 hover:underline"
              >
                {contributor.login}
              </a>
              <span className="tabular-nums text-sm text-slate-500">
                {formatCompact(contributor.contributions)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
