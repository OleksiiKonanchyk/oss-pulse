import {
  DEFAULT_TRACKED_REPOS,
  getTrackedRepos,
  subscribeToTrackedRepos,
  trackRepo,
  untrackRepo,
} from './tracked-repos'

test('seeds a first visit with the default repositories', () => {
  expect(getTrackedRepos()).toEqual(DEFAULT_TRACKED_REPOS)
})

test('tracking a repository appends it', () => {
  trackRepo('tanstack/query')
  expect(getTrackedRepos()).toContain('tanstack/query')
})

test('tracking is idempotent and case-insensitive', () => {
  trackRepo('tanstack/query')
  trackRepo('TanStack/Query')

  const matches = getTrackedRepos().filter((name) => name.toLowerCase() === 'tanstack/query')
  expect(matches).toHaveLength(1)
})

test('untracking removes a repository', () => {
  trackRepo('tanstack/query')
  untrackRepo('tanstack/query')
  expect(getTrackedRepos()).not.toContain('tanstack/query')
})

test('an emptied list stays empty rather than re-seeding', () => {
  for (const name of getTrackedRepos()) untrackRepo(name)
  expect(getTrackedRepos()).toEqual([])
})

test('subscribers are notified on change and stop after unsubscribing', () => {
  let calls = 0
  const unsubscribe = subscribeToTrackedRepos(() => {
    calls += 1
  })

  trackRepo('tanstack/query')
  expect(calls).toBe(1)

  unsubscribe()
  trackRepo('vitest-dev/vitest')
  expect(calls).toBe(1)
})

test('corrupt stored data falls back to the defaults', () => {
  localStorage.setItem('oss-pulse:tracked-repos', 'not json')
  expect(getTrackedRepos()).toEqual(DEFAULT_TRACKED_REPOS)
})
