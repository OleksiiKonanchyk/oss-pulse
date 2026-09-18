import { http, HttpResponse } from 'msw'
import { server } from '../../test/msw/server'
import { githubFetch } from './client'
import { isApiError } from './errors'

const RESET = 1_800_000_000

test('returns parsed JSON for a successful request', async () => {
  server.use(
    http.get('https://api.github.com/repos/a/b', () =>
      HttpResponse.json({ full_name: 'a/b' }),
    ),
  )

  const result = await githubFetch<{ full_name: string }>('/repos/a/b')
  expect(result.data.full_name).toBe('a/b')
})

test('exposes pagination links from the Link header', async () => {
  server.use(
    http.get('https://api.github.com/repos/a/b/issues', () =>
      HttpResponse.json([], {
        headers: { Link: '<https://api.github.com/repos/a/b/issues?page=2>; rel="next"' },
      }),
    ),
  )

  const result = await githubFetch('/repos/a/b/issues')
  expect(result.links.next).toBe('https://api.github.com/repos/a/b/issues?page=2')
})

test('exposes the rate limit from response headers', async () => {
  server.use(
    http.get('https://api.github.com/repos/a/b', () =>
      HttpResponse.json(
        {},
        {
          headers: {
            'x-ratelimit-limit': '60',
            'x-ratelimit-remaining': '57',
            'x-ratelimit-reset': String(RESET),
          },
        },
      ),
    ),
  )

  const result = await githubFetch('/repos/a/b')
  expect(result.rateLimit).toEqual({
    limit: 60,
    remaining: 57,
    resetAt: new Date(RESET * 1000),
  })
})

test('sends the Authorization header when a token is supplied', async () => {
  let authorization: string | null = null
  server.use(
    http.get('https://api.github.com/repos/a/b', ({ request }) => {
      authorization = request.headers.get('authorization')
      return HttpResponse.json({})
    }),
  )

  await githubFetch('/repos/a/b', { token: 'ghp_example' })
  expect(authorization).toBe('Bearer ghp_example')
})

test('omits the Authorization header when no token is supplied', async () => {
  let authorization: string | null = 'unset'
  server.use(
    http.get('https://api.github.com/repos/a/b', ({ request }) => {
      authorization = request.headers.get('authorization')
      return HttpResponse.json({})
    }),
  )

  await githubFetch('/repos/a/b')
  expect(authorization).toBeNull()
})

test('throws a classified GitHubError on a 404', async () => {
  server.use(
    http.get('https://api.github.com/repos/a/missing', () =>
      HttpResponse.json({ message: 'Not Found' }, { status: 404 }),
    ),
  )

  await expect(githubFetch('/repos/a/missing')).rejects.toSatisfy(
    (error: unknown) => isApiError(error) && error.error.kind === 'not-found',
  )
})

test('classifies an exhausted quota as rate-limited', async () => {
  server.use(
    http.get('https://api.github.com/repos/a/b', () =>
      HttpResponse.json({ message: 'rate limit exceeded' }, {
        status: 403,
        headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(RESET) },
      }),
    ),
  )

  await expect(githubFetch('/repos/a/b')).rejects.toSatisfy(
    (error: unknown) => isApiError(error) && error.error.kind === 'rate-limited',
  )
})

test('classifies a transport failure as a network error', async () => {
  server.use(http.get('https://api.github.com/repos/a/b', () => HttpResponse.error()))

  await expect(githubFetch('/repos/a/b')).rejects.toSatisfy(
    (error: unknown) => isApiError(error) && error.error.kind === 'network',
  )
})
