import { http, HttpResponse } from 'msw'
import { server } from '../../test/msw/server'
import { getCommitActivity, getIssues, getRepo } from './github'

test('maps a repository payload to the Repo shape', async () => {
  server.use(
    http.get('https://api.github.com/repos/facebook/react', () =>
      HttpResponse.json({
        full_name: 'facebook/react',
        description: 'A library',
        stargazers_count: 200,
        forks_count: 40,
        open_issues_count: 7,
        language: 'JavaScript',
        pushed_at: '2026-09-01T00:00:00Z',
        html_url: 'https://github.com/facebook/react',
        license: { spdx_id: 'MIT' },
      }),
    ),
  )

  const repo = await getRepo('facebook/react')

  expect(repo).toEqual({
    fullName: 'facebook/react',
    description: 'A library',
    stars: 200,
    forks: 40,
    openIssues: 7,
    language: 'JavaScript',
    pushedAt: new Date('2026-09-01T00:00:00Z'),
    htmlUrl: 'https://github.com/facebook/react',
    license: 'MIT',
  })
})

test('treats a missing license as null rather than crashing', async () => {
  server.use(
    http.get('https://api.github.com/repos/a/b', () =>
      HttpResponse.json({
        full_name: 'a/b',
        description: null,
        stargazers_count: 0,
        forks_count: 0,
        open_issues_count: 0,
        language: null,
        pushed_at: '2026-09-01T00:00:00Z',
        html_url: 'https://github.com/a/b',
        license: null,
      }),
    ),
  )

  const repo = await getRepo('a/b')
  expect(repo.license).toBeNull()
  expect(repo.language).toBeNull()
})

test('excludes pull requests from the issues list', async () => {
  server.use(
    http.get('https://api.github.com/repos/a/b/issues', () =>
      HttpResponse.json([
        { number: 1, title: 'A bug', state: 'open', user: { login: 'ann' }, labels: [], comments: 2, created_at: '2026-09-01T00:00:00Z', html_url: 'https://github.com/a/b/issues/1' },
        { number: 2, title: 'A PR', state: 'open', user: { login: 'bob' }, labels: [], comments: 0, created_at: '2026-09-02T00:00:00Z', html_url: 'https://github.com/a/b/pull/2', pull_request: { url: 'x' } },
      ]),
    ),
  )

  const { issues } = await getIssues('a/b', { state: 'open', page: 1 })

  expect(issues).toHaveLength(1)
  expect(issues[0].number).toBe(1)
})

test('reports a next page when the Link header advertises one', async () => {
  server.use(
    http.get('https://api.github.com/repos/a/b/issues', () =>
      HttpResponse.json([], {
        headers: { Link: '<https://api.github.com/repos/a/b/issues?page=2>; rel="next"' },
      }),
    ),
  )

  const { hasNextPage } = await getIssues('a/b', { state: 'open', page: 1 })
  expect(hasNextPage).toBe(true)
})

test('passes filters through as query parameters', async () => {
  let url = ''
  server.use(
    http.get('https://api.github.com/repos/a/b/issues', ({ request }) => {
      url = request.url
      return HttpResponse.json([])
    }),
  )

  await getIssues('a/b', { state: 'closed', labels: 'bug,ui', creator: 'ann', page: 3 })

  expect(url).toContain('state=closed')
  expect(url).toContain('labels=bug%2Cui')
  expect(url).toContain('creator=ann')
  expect(url).toContain('page=3')
})

test('maps commit activity weeks', async () => {
  server.use(
    http.get('https://api.github.com/repos/a/b/stats/commit_activity', () =>
      HttpResponse.json([{ week: 1_756_000_000, total: 12, days: [1, 2, 3, 4, 2, 0, 0] }]),
    ),
  )

  const activity = await getCommitActivity('a/b')

  expect(activity).toEqual([{ weekStart: new Date(1_756_000_000 * 1000), total: 12 }])
})

test('retries while GitHub answers 202, then returns the computed data', async () => {
  let calls = 0
  server.use(
    http.get('https://api.github.com/repos/a/b/stats/commit_activity', () => {
      calls += 1
      if (calls < 3) return new HttpResponse(null, { status: 202 })
      return HttpResponse.json([{ week: 1_756_000_000, total: 5, days: [] }])
    }),
  )

  const activity = await getCommitActivity('a/b', { delayMs: 0 })

  expect(calls).toBe(3)
  expect(activity).toEqual([{ weekStart: new Date(1_756_000_000 * 1000), total: 5 }])
})

test('gives up after the attempt ceiling and reports it is still computing', async () => {
  let calls = 0
  server.use(
    http.get('https://api.github.com/repos/a/b/stats/commit_activity', () => {
      calls += 1
      return new HttpResponse(null, { status: 202 })
    }),
  )

  const activity = await getCommitActivity('a/b', { attempts: 3, delayMs: 0 })

  expect(activity).toBe('computing')
  expect(calls).toBe(3)
})
