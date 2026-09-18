import { githubFetch, type FetchOptions } from './client'
import type { CommitWeek, Contributor, Issue, IssueFilters, Repo } from './types'

type RepoPayload = {
  full_name: string
  description: string | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  language: string | null
  pushed_at: string
  html_url: string
  license: { spdx_id: string } | null
}

export async function getRepo(fullName: string, options?: FetchOptions): Promise<Repo> {
  const { data } = await githubFetch<RepoPayload>(`/repos/${fullName}`, options)

  return {
    fullName: data.full_name,
    description: data.description,
    stars: data.stargazers_count,
    forks: data.forks_count,
    openIssues: data.open_issues_count,
    language: data.language,
    pushedAt: new Date(data.pushed_at),
    htmlUrl: data.html_url,
    license: data.license?.spdx_id ?? null,
  }
}

type ContributorPayload = {
  login: string
  avatar_url: string
  contributions: number
  html_url: string
}

export async function getContributors(
  fullName: string,
  options?: FetchOptions,
): Promise<Contributor[]> {
  const { data } = await githubFetch<ContributorPayload[]>(
    `/repos/${fullName}/contributors?per_page=10`,
    options,
  )

  return data.map((entry) => ({
    login: entry.login,
    avatarUrl: entry.avatar_url,
    contributions: entry.contributions,
    htmlUrl: entry.html_url,
  }))
}

type IssuePayload = {
  number: number
  title: string
  state: 'open' | 'closed'
  user: { login: string } | null
  labels: { name: string; color: string }[]
  comments: number
  created_at: string
  html_url: string
  pull_request?: unknown
}

/**
 * `/issues` returns pull requests too — GitHub models them as issues. Every
 * consumer here means issues in the colloquial sense, so they are filtered out
 * at the boundary rather than in each caller.
 */
export async function getIssues(
  fullName: string,
  filters: IssueFilters,
  options?: FetchOptions,
): Promise<{ issues: Issue[]; hasNextPage: boolean }> {
  const params = new URLSearchParams({
    state: filters.state,
    page: String(filters.page),
    per_page: '25',
  })
  if (filters.labels) params.set('labels', filters.labels)
  if (filters.creator) params.set('creator', filters.creator)

  const { data, links } = await githubFetch<IssuePayload[]>(
    `/repos/${fullName}/issues?${params}`,
    options,
  )

  return {
    issues: data
      .filter((entry) => entry.pull_request === undefined)
      .map((entry) => ({
        number: entry.number,
        title: entry.title,
        state: entry.state,
        author: entry.user?.login ?? null,
        labels: entry.labels,
        comments: entry.comments,
        createdAt: new Date(entry.created_at),
        htmlUrl: entry.html_url,
      })),
    hasNextPage: links.next !== undefined,
  }
}

type CommitActivityPayload = { week: number; total: number; days: number[] }

const DEFAULT_ATTEMPTS = 5
const DEFAULT_DELAY_MS = 1500

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * GitHub computes repository statistics asynchronously and answers `202` with an
 * empty body while it works. Returning 'computing' rather than throwing lets the
 * UI say what is actually happening instead of showing a failure.
 */
export async function getCommitActivity(
  fullName: string,
  options: FetchOptions & { attempts?: number; delayMs?: number } = {},
): Promise<CommitWeek[] | 'computing'> {
  const { attempts = DEFAULT_ATTEMPTS, delayMs = DEFAULT_DELAY_MS, ...fetchOptions } = options

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const { data } = await githubFetch<CommitActivityPayload[] | null>(
      `/repos/${fullName}/stats/commit_activity`,
      fetchOptions,
    )

    if (Array.isArray(data)) {
      return data.map((week) => ({
        weekStart: new Date(week.week * 1000),
        total: week.total,
      }))
    }

    if (attempt < attempts - 1) await wait(delayMs)
  }

  return 'computing'
}
