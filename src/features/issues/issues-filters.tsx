import { useEffect, useState } from 'react'
import type { IssueFilters } from '../../api/types'

type Props = {
  filters: IssueFilters
  onChange: (next: Partial<IssueFilters>) => void
}

/**
 * The state select commits immediately (it's a discrete choice, not typed text), but the
 * labels and author inputs hold their own draft value and only call onChange on blur or
 * Enter. Firing onChange per keystroke would refetch on every character — at 60
 * requests/hour unauthenticated, typing one filter value could burn the whole budget.
 */
export function IssuesFilters({ filters, onChange }: Props) {
  const [labelsInput, setLabelsInput] = useState(filters.labels ?? '')
  const [creatorInput, setCreatorInput] = useState(filters.creator ?? '')

  // Re-sync the draft when the committed value changes from outside this component
  // (URL navigation, browser back/forward) — but typing itself never triggers this,
  // since it only changes local state, not filters.
  useEffect(() => {
    setLabelsInput(filters.labels ?? '')
  }, [filters.labels])

  useEffect(() => {
    setCreatorInput(filters.creator ?? '')
  }, [filters.creator])

  function commitLabels() {
    const next = labelsInput.trim() || undefined
    if (next !== filters.labels) onChange({ labels: next })
  }

  function commitCreator() {
    const next = creatorInput.trim() || undefined
    if (next !== filters.creator) onChange({ creator: next })
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <label htmlFor="issues-state" className="block text-sm font-medium">
          State
        </label>
        <select
          id="issues-state"
          value={filters.state}
          onChange={(event) =>
            onChange({ state: event.target.value as IssueFilters['state'] })
          }
          className="mt-1 rounded border border-slate-300 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="all">All</option>
        </select>
      </div>

      <div>
        <label htmlFor="issues-labels" className="block text-sm font-medium">
          Labels
        </label>
        <input
          id="issues-labels"
          type="text"
          value={labelsInput}
          onChange={(event) => setLabelsInput(event.target.value)}
          onBlur={commitLabels}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commitLabels()
            }
          }}
          placeholder="bug, help wanted"
          className="mt-1 rounded border border-slate-300 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      <div>
        <label htmlFor="issues-creator" className="block text-sm font-medium">
          Author
        </label>
        <input
          id="issues-creator"
          type="text"
          value={creatorInput}
          onChange={(event) => setCreatorInput(event.target.value)}
          onBlur={commitCreator}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commitCreator()
            }
          }}
          placeholder="octocat"
          className="mt-1 rounded border border-slate-300 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900"
        />
      </div>
    </div>
  )
}
