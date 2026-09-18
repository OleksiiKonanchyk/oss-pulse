import { useQueries, useQuery } from '@tanstack/react-query'
import { getCommitActivity, getContributors, getIssues, getRepo } from '../api/github'
import type { IssueFilters } from '../api/types'
import { getToken, useToken } from '../lib/token'
import { queryKeys } from './keys'

export function useRepo(fullName: string) {
  const token = useToken()

  return useQuery({
    queryKey: queryKeys.repo(fullName),
    queryFn: ({ signal }) => getRepo(fullName, { token, signal }),
  })
}

/**
 * The whole tracked set, for the things only the overview can decide: whether every row
 * failed the same way, and what order to put the rows in.
 *
 * These share their query keys with the `useRepo` call inside each row, so the two hooks
 * read one cache entry per repository and the extra subscription costs no extra request —
 * which is the only reason the overview can afford to know all of this at once.
 */
export function useRepos(fullNames: readonly string[]) {
  const token = useToken()

  return useQueries({
    queries: fullNames.map((fullName) => ({
      queryKey: queryKeys.repo(fullName),
      queryFn: ({ signal }: { signal: AbortSignal }) => getRepo(fullName, { token, signal }),
    })),
  })
}

export function useContributors(fullName: string) {
  const token = useToken()

  return useQuery({
    queryKey: queryKeys.contributors(fullName),
    queryFn: ({ signal }) => getContributors(fullName, { token, signal }),
  })
}

/**
 * `enabled` exists for the overview sparklines: a row whose repository request already
 * failed has nothing to draw, and spending another request from a 60-per-hour budget to
 * confirm that would be the wrong trade.
 */
export function useCommitActivity(fullName: string, { enabled = true } = {}) {
  const token = useToken()

  return useQuery({
    queryKey: queryKeys.commitActivity(fullName),
    queryFn: ({ signal }) => getCommitActivity(fullName, { token, signal }),
    enabled,
  })
}

export function useIssues(fullName: string, filters: IssueFilters) {
  const token = useToken()

  return useQuery({
    queryKey: queryKeys.issues(fullName, filters),
    queryFn: ({ signal }) => getIssues(fullName, filters, { token, signal }),
    placeholderData: (previous) => previous,
  })
}

/** Used by the add-repo form to check a repository exists before tracking it. */
export function verifyRepoExists(fullName: string) {
  return getRepo(fullName, { token: getToken() })
}
