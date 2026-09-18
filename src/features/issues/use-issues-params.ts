import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { IssueFilters } from '../../api/types'

const STATES = ['open', 'closed', 'all'] as const

function readState(value: string | null): IssueFilters['state'] {
  return (STATES as readonly string[]).includes(value ?? '')
    ? (value as IssueFilters['state'])
    : 'open'
}

function readPage(value: string | null): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

export function useIssuesParams() {
  const [params, setParams] = useSearchParams()

  const filters: IssueFilters = {
    state: readState(params.get('state')),
    labels: params.get('labels') ?? undefined,
    creator: params.get('creator') ?? undefined,
    page: readPage(params.get('page')),
  }

  /**
   * Any change other than paging resets to page one — page 7 of a different
   * filter is almost always empty, and landing there reads as a bug.
   */
  const setFilters = useCallback(
    (next: Partial<IssueFilters>) => {
      const merged = { ...filters, ...next }
      const pagingOnly = Object.keys(next).length === 1 && 'page' in next
      const updated = new URLSearchParams()

      if (merged.state !== 'open') updated.set('state', merged.state)
      if (merged.labels) updated.set('labels', merged.labels)
      if (merged.creator) updated.set('creator', merged.creator)

      const page = pagingOnly ? merged.page : 1
      if (page > 1) updated.set('page', String(page))

      setParams(updated)
    },
    [filters, setParams],
  )

  return { filters, setFilters }
}
