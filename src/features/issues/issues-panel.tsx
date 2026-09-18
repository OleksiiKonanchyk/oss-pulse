import type { IssueFilters } from '../../api/types'
import { Card } from '../../components/card'
import { EmptyState } from '../../components/empty-state'
import { ErrorState } from '../../components/error-state'
import { Skeleton } from '../../components/skeleton'
import { useIssues } from '../../queries/use-github-queries'
import { IssueThroughputChart } from '../repo/issue-throughput-chart'
import { IssuesFilters } from './issues-filters'
import { IssuesTable } from './issues-table'
import { useIssuesParams } from './use-issues-params'

/**
 * `useIssues` sets `placeholderData: (previous) => previous`, so a filter or page change
 * swaps the visible rows silently — the results container is never unmounted, so an
 * assistive-technology user gets no signal anything happened. This produces the text for
 * a persistent status region that names both the count and the active state/page, so a
 * filter change ("3 closed issues") reads differently from a page change ("page 2").
 */
function describeResult(
  status: 'pending' | 'error' | 'ready',
  filters: IssueFilters,
  count: number | undefined,
): string {
  if (status === 'pending') return 'Loading issues'
  if (status === 'error') return 'Issues failed to load'
  if (count === undefined) return ''

  const stateLabel = filters.state === 'all' ? 'all' : filters.state
  return count === 0
    ? `No ${stateLabel} issues match these filters, page ${filters.page}`
    : `${count} ${stateLabel} issue${count === 1 ? '' : 's'}, page ${filters.page}`
}

export function IssuesPanel({ fullName }: { fullName: string }) {
  const { filters, setFilters } = useIssuesParams()
  const { data, isPending, isError, error, refetch, isFetching } = useIssues(fullName, filters)

  const status = isPending ? 'pending' : isError ? 'error' : 'ready'
  const statusText = describeResult(status, filters, data?.issues.length)

  return (
    <div className="space-y-6">
      {/*
        The chart is fed the rows already on screen — one page of 25, as filtered — because
        a repository-wide series would cost one request per page of history, which this
        app's request budget does not have. That is a defensible trade, but only if the
        card says so: labelled "Issues opened per week" it silently rewrote its own meaning
        every time the reader paged or changed the filter.

        No status region here: the same query feeds the table below, whose region already
        announces the load, and announcing it twice is the bug fixed elsewhere in this
        file's neighbourhood.
      */}
      <Card title="Issues on this page, by week opened">
        {data ? <IssueThroughputChart issues={data.issues} /> : <Skeleton rows={3} />}
      </Card>

      <Card title="Issues">
        <IssuesFilters filters={filters} onChange={setFilters} />

        <div className="mt-4" aria-busy={isFetching}>
          <span
            role="status"
            aria-live="polite"
            aria-atomic="true"
            data-testid="issues-status"
            className="sr-only"
          >
            {statusText}
          </span>

          {isPending ? (
            <Skeleton rows={6} />
          ) : isError ? (
            <ErrorState error={error} onRetry={() => refetch()} />
          ) : data.issues.length === 0 ? (
            <EmptyState
              title="No issues match these filters"
              description="Try widening the state, or clearing the label and author filters."
            />
          ) : (
            <IssuesTable issues={data.issues} />
          )}
        </div>

        <nav className="mt-4 flex items-center justify-between" aria-label="Issue pages">
          <button
            type="button"
            onClick={() => setFilters({ page: filters.page - 1 })}
            disabled={filters.page <= 1}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-slate-700"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">Page {filters.page}</span>
          <button
            type="button"
            onClick={() => setFilters({ page: filters.page + 1 })}
            disabled={!data?.hasNextPage}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-slate-700"
          >
            Next
          </button>
        </nav>
      </Card>
    </div>
  )
}
