import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, vi } from 'vitest'
import { GitHubError } from '../api/errors'
import { ErrorState } from './error-state'

function renderRateLimited(resetAt: Date) {
  return render(
    <MemoryRouter>
      <ErrorState error={new GitHubError({ kind: 'rate-limited', resetAt })} />
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.useRealTimers()
})

test('shows the reset time when the rate limit is exhausted', () => {
  renderRateLimited(new Date(Date.now() + 15 * 60 * 1000))

  expect(screen.getByRole('heading', { name: /rate limit/i })).toBeInTheDocument()
  expect(screen.getByText(/add a token/i)).toBeInTheDocument()
})

test('the reset countdown ticks down while the screen is open', () => {
  vi.useFakeTimers()
  renderRateLimited(new Date(Date.now() + 90 * 1000))

  expect(screen.getByTestId('rate-limit-countdown')).toHaveTextContent('1:30')

  act(() => {
    vi.advanceTimersByTime(3 * 1000)
  })

  expect(screen.getByTestId('rate-limit-countdown')).toHaveTextContent('1:27')
})

test('the countdown stops at zero rather than going negative', () => {
  vi.useFakeTimers()
  renderRateLimited(new Date(Date.now() + 2 * 1000))

  act(() => {
    vi.advanceTimersByTime(10 * 1000)
  })

  expect(screen.getByTestId('rate-limit-countdown')).toHaveTextContent(/any moment now/i)
  expect(vi.getTimerCount()).toBe(0)
})

test('the countdown timer is cleared when the screen unmounts', () => {
  vi.useFakeTimers()
  const { unmount } = renderRateLimited(new Date(Date.now() + 15 * 60 * 1000))

  expect(vi.getTimerCount()).toBe(1)
  unmount()
  expect(vi.getTimerCount()).toBe(0)
})

test('the ticking clock is hidden from assistive technology', () => {
  // The surrounding role="alert" is an atomic live region: a value that changed once a
  // second inside it would be re-announced once a second. The absolute reset time, which
  // never changes, stays in the announced sentence.
  renderRateLimited(new Date(Date.now() + 15 * 60 * 1000))

  expect(screen.getByTestId('rate-limit-countdown').closest('[aria-hidden="true"]')).not.toBeNull()
  expect(screen.getByRole('alert')).toHaveTextContent(/resets at/i)
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

test('shows status code for unknown GitHub errors without leaking raw messages', () => {
  render(
    <MemoryRouter>
      <ErrorState error={new GitHubError({ kind: 'unknown', status: 502, message: 'Bad gateway' })} />
    </MemoryRouter>
  )

  expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument()
  expect(screen.getByText(/502/)).toBeInTheDocument()
  expect(screen.queryByText(/bad gateway/i)).not.toBeInTheDocument()
})
