import { act, render, screen } from '@testing-library/react'
import { publishRateLimit } from '../api/rate-limit'
import { RateLimitBadge } from './rate-limit-badge'

function announce(remaining: number) {
  act(() => {
    publishRateLimit({ limit: 60, remaining, resetAt: new Date('2026-09-18T18:00:00Z') })
  })
}

test('the live region exists before there is any quota to announce', () => {
  render(<RateLimitBadge />)

  const region = screen.getByTestId('rate-limit-badge')
  expect(region).toHaveAttribute('role', 'status')
  expect(region).toHaveAttribute('aria-live', 'polite')
  expect(region).toHaveAttribute('aria-atomic', 'true')
  expect(region).toHaveTextContent('')
})

/**
 * The structural property that makes an announcement possible: assistive technology has to
 * have observed the region before its text changes. A badge that returns `null` until the
 * first response arrives is a live region that never announces anything.
 */
test('the same region is updated in place when quota arrives', () => {
  render(<RateLimitBadge />)
  const before = screen.getByTestId('rate-limit-badge')

  announce(42)

  const after = screen.getByTestId('rate-limit-badge')
  expect(after).toBe(before)
  expect(after).toHaveTextContent('42/60 API requests left')
})

test('the same region survives a second update', () => {
  render(<RateLimitBadge />)
  announce(42)
  const first = screen.getByTestId('rate-limit-badge')

  announce(8)

  expect(screen.getByTestId('rate-limit-badge')).toBe(first)
  expect(first).toHaveTextContent('8/60 API requests left')
})
