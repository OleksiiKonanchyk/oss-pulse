import { queryClient } from './client'
import { queryKeys } from './keys'

test('caches responses for an hour to survive the 60 requests/hour limit', () => {
  const defaults = queryClient.getDefaultOptions().queries
  expect(defaults?.staleTime).toBe(3_600_000)
})

test('does not retry rate-limited requests', () => {
  const defaults = queryClient.getDefaultOptions().queries
  expect(defaults?.retry).toBe(false)
})

test('issue query keys vary with their filters', () => {
  const first = queryKeys.issues('a/b', { state: 'open', page: 1 })
  const second = queryKeys.issues('a/b', { state: 'closed', page: 1 })

  expect(first).not.toEqual(second)
})
