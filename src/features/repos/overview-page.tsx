import { useState } from 'react'
import { sharedApiError } from '../../api/errors'
import { EmptyState } from '../../components/empty-state'
import { ErrorState } from '../../components/error-state'
import { useRepos } from '../../queries/use-github-queries'
import { AddRepoForm } from './add-repo-form'
import { RepoRow } from './repo-row'
import { SORT_COLUMNS, nextSort, sortRepoRows, type Sort, type SortKey } from './sort-repos'
import { useTrackedRepos } from './use-tracked-repos'

function ariaSort(sort: Sort, key: SortKey): 'ascending' | 'descending' | 'none' {
  if (sort.key !== key) return 'none'

  return sort.direction === 'asc' ? 'ascending' : 'descending'
}

export function OverviewPage() {
  const { repos, untrack } = useTrackedRepos()
  const results = useRepos(repos)
  const [sort, setSort] = useState<Sort>({ key: 'name', direction: 'asc' })

  /**
   * Per-row degradation is right for a repository that was renamed or deleted: the rest
   * of the table is still true. It is wrong for an exhausted quota, which takes out every
   * row at once — rendering that as a column of em-dashes throws away the one screen this
   * app was built to show. When the whole table failed the same way, the condition is
   * global and gets named above the table; anything mixed stays per-row.
   */
  const everyRowFailed = results.length > 0 && results.every((result) => result.isError)
  const wholeTableError = everyRowFailed
    ? sharedApiError(results.map((result) => result.error))
    : null

  const rows = sortRepoRows(
    repos.map((fullName, index) => ({ fullName, repo: results[index]?.data })),
    sort,
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Tracked repositories</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Activity and issue load across the projects you follow.
          </p>
        </div>
        <AddRepoForm />
      </div>

      {wholeTableError && (
        <ErrorState
          error={wholeTableError}
          onRetry={() => {
            for (const result of results) void result.refetch()
          }}
        />
      )}

      {repos.length === 0 ? (
        <EmptyState
          title="Nothing tracked yet"
          description="Add a repository by owner and name to start following it."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left">
            <caption className="sr-only">Tracked repositories and their current activity</caption>
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {SORT_COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={ariaSort(sort, column.key)}
                    className="px-4 py-3"
                  >
                    <button
                      type="button"
                      onClick={() => setSort((current) => nextSort(current, column.key))}
                      className="flex items-center gap-1 uppercase tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                    >
                      {column.label}
                      {/* The arrow is decoration; aria-sort on the header carries the
                          state, and the column's accessible name stays its label. */}
                      <span aria-hidden="true" className="text-[0.6rem]">
                        {sort.key === column.key ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </button>
                  </th>
                ))}
                <th scope="col" className="px-4 py-3">
                  Activity
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <RepoRow
                  key={row.fullName}
                  fullName={row.fullName}
                  onUntrack={() => untrack(row.fullName)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
