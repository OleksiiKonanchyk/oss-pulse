import type { Repo } from '../../api/types'

export type SortKey = 'name' | 'stars' | 'openIssues' | 'pushedAt'
export type SortDirection = 'asc' | 'desc'
export type Sort = { key: SortKey; direction: SortDirection }

export type RepoRowData = { fullName: string; repo: Repo | undefined }

export const SORT_COLUMNS: readonly { key: SortKey; label: string; initial: SortDirection }[] = [
  { key: 'name', label: 'Repository', initial: 'asc' },
  { key: 'stars', label: 'Stars', initial: 'desc' },
  { key: 'openIssues', label: 'Open issues', initial: 'desc' },
  { key: 'pushedAt', label: 'Last push', initial: 'desc' },
]

function compareLoaded(a: Repo, b: Repo, key: Exclude<SortKey, 'name'>): number {
  switch (key) {
    case 'stars':
      return a.stars - b.stars
    case 'openIssues':
      return a.openIssues - b.openIssues
    case 'pushedAt':
      return a.pushedAt.getTime() - b.pushedAt.getTime()
  }
}

/**
 * Sorting a table whose rows are still arriving one request at a time needs a rule for
 * rows with no data yet — a rate-limited or 404'd row never gets any.
 *
 * Name is sorted on the tracked `owner/name` string, which is known before any request
 * resolves, so that column never reshuffles as responses land. The value columns can only
 * order rows they have numbers for: those sort normally and everything unresolved keeps
 * its tracked order at the bottom, rather than being treated as zero and interleaved with
 * genuinely quiet repositories.
 *
 * Returns a new array; `Array#sort` is stable, so equal rows keep their tracked order.
 */
export function sortRepoRows(rows: readonly RepoRowData[], sort: Sort): RepoRowData[] {
  const sign = sort.direction === 'asc' ? 1 : -1

  if (sort.key === 'name') {
    return [...rows].sort((a, b) => sign * a.fullName.localeCompare(b.fullName))
  }

  const key = sort.key
  const loaded = rows.filter((row): row is { fullName: string; repo: Repo } => row.repo !== undefined)
  const unresolved = rows.filter((row) => row.repo === undefined)

  loaded.sort((a, b) => sign * compareLoaded(a.repo, b.repo, key))

  return [...loaded, ...unresolved]
}

/** Clicking the active column reverses it; clicking a new one starts at its natural end. */
export function nextSort(current: Sort, key: SortKey): Sort {
  if (current.key === key) {
    return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
  }

  const column = SORT_COLUMNS.find((candidate) => candidate.key === key)

  return { key, direction: column?.initial ?? 'asc' }
}
