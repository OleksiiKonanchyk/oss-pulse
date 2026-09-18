import { useQuery } from '@tanstack/react-query'
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

export function useContributors(fullName: string) {
  const token = useToken()

  return useQuery({
    queryKey: queryKeys.contributors(fullName),
    queryFn: ({ signal }) => getContributors(fullName, { token, signal }),
  })
}

export function useCommitActivity(fullName: string) {
  const token = useToken()

  return useQuery({
    queryKey: queryKeys.commitActivity(fullName),
    queryFn: ({ signal }) => getCommitActivity(fullName, { token, signal }),
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
