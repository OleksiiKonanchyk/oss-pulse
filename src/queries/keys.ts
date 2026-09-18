import type { IssueFilters } from '../api/types'

export const queryKeys = {
  repo: (fullName: string) => ['repo', fullName] as const,
  contributors: (fullName: string) => ['contributors', fullName] as const,
  commitActivity: (fullName: string) => ['commit-activity', fullName] as const,
  issues: (fullName: string, filters: IssueFilters) =>
    ['issues', fullName, filters.state, filters.labels ?? '', filters.creator ?? '', filters.page] as const,
}
