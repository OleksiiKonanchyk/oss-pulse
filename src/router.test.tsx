import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, vi } from 'vitest'
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
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(<RouterProvider router={router} />)
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
