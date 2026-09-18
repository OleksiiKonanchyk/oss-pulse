import type { Repo } from '../../api/types'
import { nextSort, sortRepoRows, type RepoRowData } from './sort-repos'

function repo(fullName: string, stars: number, openIssues: number, pushedAt: string): Repo {
  return {
    fullName,
    description: null,
    stars,
    forks: 0,
    openIssues,
    language: null,
    pushedAt: new Date(pushedAt),
    htmlUrl: `https://github.com/${fullName}`,
    license: null,
  }
}

const rows: RepoRowData[] = [
  { fullName: 'vercel/next.js', repo: repo('vercel/next.js', 120, 9, '2026-09-01T00:00:00Z') },
  { fullName: 'facebook/react', repo: repo('facebook/react', 300, 2, '2026-08-01T00:00:00Z') },
  { fullName: 'rails/rails', repo: repo('rails/rails', 200, 5, '2026-09-10T00:00:00Z') },
]

function names(sorted: RepoRowData[]): string[] {
  return sorted.map((row) => row.fullName)
}

test('sorts by name in both directions', () => {
  expect(names(sortRepoRows(rows, { key: 'name', direction: 'asc' }))).toEqual([
    'facebook/react',
    'rails/rails',
    'vercel/next.js',
  ])
  expect(names(sortRepoRows(rows, { key: 'name', direction: 'desc' }))).toEqual([
    'vercel/next.js',
    'rails/rails',
    'facebook/react',
  ])
})

test('sorts by stars, open issues and last push', () => {
  expect(names(sortRepoRows(rows, { key: 'stars', direction: 'desc' }))[0]).toBe('facebook/react')
  expect(names(sortRepoRows(rows, { key: 'openIssues', direction: 'desc' }))[0]).toBe(
    'vercel/next.js',
  )
  expect(names(sortRepoRows(rows, { key: 'pushedAt', direction: 'desc' }))[0]).toBe('rails/rails')
})

test('sorting by name works before any repository has loaded', () => {
  const pending: RepoRowData[] = [
    { fullName: 'vercel/next.js', repo: undefined },
    { fullName: 'facebook/react', repo: undefined },
  ]

  expect(names(sortRepoRows(pending, { key: 'name', direction: 'asc' }))).toEqual([
    'facebook/react',
    'vercel/next.js',
  ])
})

test('a row with no data sinks to the bottom of a value sort instead of counting as zero', () => {
  const withFailure: RepoRowData[] = [
    ...rows,
    { fullName: 'ghost/repo', repo: undefined },
  ]

  expect(names(sortRepoRows(withFailure, { key: 'stars', direction: 'asc' }))).toEqual([
    'vercel/next.js',
    'rails/rails',
    'facebook/react',
    'ghost/repo',
  ])
})

test('does not mutate the array it was given', () => {
  const original = names(rows)
  sortRepoRows(rows, { key: 'stars', direction: 'desc' })

  expect(names(rows)).toEqual(original)
})

test('clicking the active column reverses it, a new column starts at its natural end', () => {
  expect(nextSort({ key: 'name', direction: 'asc' }, 'name')).toEqual({
    key: 'name',
    direction: 'desc',
  })
  // Most stars first is what someone clicking "Stars" means.
  expect(nextSort({ key: 'name', direction: 'asc' }, 'stars')).toEqual({
    key: 'stars',
    direction: 'desc',
  })
})
