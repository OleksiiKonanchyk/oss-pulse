import { Card } from '../../components/card'
import { EmptyState } from '../../components/empty-state'
import { ErrorState } from '../../components/error-state'
import { Skeleton } from '../../components/skeleton'
import { useIssues } from '../../queries/use-github-queries'
import { IssueThroughputChart } from '../repo/issue-throughput-chart'
import { IssuesFilters } from './issues-filters'
import { IssuesTable } from './issues-table'
import { useIssuesParams } from './use-issues-params'

export function IssuesPanel({ fullName }: { fullName: string }) {
  const { filters, setFilters } = useIssuesParams()
  const { data, isPending, isError, error, refetch, isFetching } = useIssues(fullName, filters)

  return (
    <div className="space-y-6">
      <Card title="Issues opened per week">
        {data ? <IssueThroughputChart issues={data.issues} /> : <Skeleton rows={3} />}
      </Card>

      <Card title="Issues">
        <IssuesFilters filters={filters} onChange={setFilters} />

        <div className="mt-4" aria-busy={isFetching}>
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
