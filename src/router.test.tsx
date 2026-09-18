import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, vi } from 'vitest'
import { server } from '../test/msw/server'
import { GitHubError } from './api/errors'
import { routes } from './router'

// The only way to prove an error boundary is wired is to make a route throw. `vi.hoisted`
// keeps the thrown value swappable per test while satisfying `vi.mock`'s hoisting.
const panel = vi.hoisted(() => ({ error: undefined as unknown }))

vi.mock('./features/repos/overview-page', () => ({
  OverviewPage: () => {
    throw panel.error
  },
}))

// React logs every error a boundary catches. That is correct behaviour, but it is not
// test output worth reading.
let consoleError: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  consoleError.mockRestore()
})

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })

  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

test('a route that throws renders the app error state, not React Router default screen', () => {
  panel.error = new Error('panel exploded')

  renderAt('/')

  expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument()
  // React Router's unstyled fallback opens with "Hey developer 👋". Its absence is the
  // whole point of the boundary.
  expect(screen.queryByText(/hey developer/i)).not.toBeInTheDocument()
})

test('a failure in one panel leaves the surrounding layout on screen', () => {
  panel.error = new Error('panel exploded')

  renderAt('/')

  expect(screen.getByRole('link', { name: 'OSS Pulse' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
})

test('a classified API error thrown during render keeps its designed screen', () => {
  panel.error = new GitHubError({ kind: 'rate-limited', resetAt: new Date(Date.now() + 60_000) })

  renderAt('/')

  expect(screen.getByRole('heading', { name: /rate limit/i })).toBeInTheDocument()
})

/**
 * The repository route is lazily imported so that Recharts stays out of the entry chunk.
 * A `React.lazy` element that is not wrapped in `Suspense` throws at render, so this both
 * proves the split route still resolves and guards the boundary that makes it legal.
 */
test('the lazily-loaded repository route resolves and renders', async () => {
  const repo = 'https://api.github.com/repos/a/b'
  server.use(
    http.get(repo, () =>
      HttpResponse.json({
        full_name: 'a/b',
        description: null,
        stargazers_count: 1,
        forks_count: 1,
        open_issues_count: 0,
        language: null,
        pushed_at: '2026-09-01T00:00:00Z',
        html_url: 'https://github.com/a/b',
        license: null,
      }),
    ),
    http.get(`${repo}/stats/commit_activity`, () => HttpResponse.json([])),
    http.get(`${repo}/contributors`, () => HttpResponse.json([])),
    http.get(`${repo}/issues`, () => HttpResponse.json([])),
  )

  renderAt('/repo/a/b')

  expect(await screen.findByRole('heading', { name: 'a/b' })).toBeInTheDocument()
})
