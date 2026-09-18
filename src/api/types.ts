export type Repo = {
  fullName: string
  description: string | null
  stars: number
  forks: number
  openIssues: number
  language: string | null
  pushedAt: Date
  htmlUrl: string
  license: string | null
}

export type Issue = {
  number: number
  title: string
  state: 'open' | 'closed'
  author: string | null
  labels: { name: string; color: string }[]
  comments: number
  createdAt: Date
  htmlUrl: string
}

export type Contributor = {
  login: string
  avatarUrl: string
  contributions: number
  htmlUrl: string
}

export type CommitWeek = {
  weekStart: Date
  total: number
}

export type IssueFilters = {
  state: 'open' | 'closed' | 'all'
  labels?: string
  creator?: string
  page: number
}
