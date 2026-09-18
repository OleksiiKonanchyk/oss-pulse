import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { GitHubError } from '../api/errors'
import { ErrorState } from './error-state'

test('shows the reset time when the rate limit is exhausted', () => {
  const resetAt = new Date(Date.now() + 15 * 60 * 1000)
  render(
    <MemoryRouter>
      <ErrorState error={new GitHubError({ kind: 'rate-limited', resetAt })} />
    </MemoryRouter>
  )

  expect(screen.getByRole('heading', { name: /rate limit/i })).toBeInTheDocument()
  expect(screen.getByText(/add a token/i)).toBeInTheDocument()
})

test('shows a not-found message for a missing repository', () => {
  render(
    <MemoryRouter>
      <ErrorState error={new GitHubError({ kind: 'not-found' })} />
    </MemoryRouter>
  )
  expect(screen.getByRole('heading', { name: /not found/i })).toBeInTheDocument()
})

test('shows a connection message for a network failure', () => {
  render(
    <MemoryRouter>
      <ErrorState error={new GitHubError({ kind: 'network' })} />
    </MemoryRouter>
  )
  expect(screen.getByRole('heading', { name: /connection/i })).toBeInTheDocument()
})

test('renders unexpected errors without leaking a raw stack', () => {
  render(
    <MemoryRouter>
      <ErrorState error={new Error('kaboom')} />
    </MemoryRouter>
  )

  expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument()
  expect(screen.queryByText(/kaboom/)).not.toBeInTheDocument()
})
