import { QueryClient, dehydrate } from '@tanstack/react-query'
import { deserializeCache, queryClient, serializeCache } from './client'
import { queryKeys } from './keys'
import type { Repo } from '../api/types'

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

/**
 * Regression coverage for the crash-on-refresh bug: `createSyncStoragePersister`
 * round-trips the cache through `JSON.stringify`/`JSON.parse` by default, which
 * turns `Date` fields into ISO strings on the way out and never turns them
 * back on the way in. These tests drive `serializeCache`/`deserializeCache` —
 * the exact functions wired into `createPersister`'s `serialize`/`deserialize`
 * options — through a real dehydrated query cache, rather than asserting on
 * some hand-rolled stand-in for what the persister does.
 */
describe('cache serialization date revival', () => {
  const REPO_BASE = {
    fullName: 'octo/repo',
    description: 'Released 2024-01-15T10:00:00.000Z after the beta.',
    stars: 1,
    forks: 1,
    openIssues: 0,
    language: null,
    htmlUrl: 'https://example.com/octo/repo',
    license: null,
  } satisfies Omit<Repo, 'pushedAt'>

  function persistAndRestore(repo: Repo) {
    const client = new QueryClient()
    client.setQueryData(['repo', repo.fullName], repo)

    const persisted = serializeCache({
      timestamp: Date.now(),
      buster: '',
      clientState: dehydrate(client),
    })

    return deserializeCache(persisted)
  }

  test('restores a persisted Date field as a real Date, not a string', () => {
    const pushedAt = new Date('2026-09-18T09:18:04.000Z')
    const repo: Repo = { ...REPO_BASE, pushedAt }

    const restored = persistAndRestore(repo)
    const restoredRepo = restored.clientState.queries[0]?.state.data as Repo

    expect(restoredRepo.pushedAt).toBeInstanceOf(Date)
    expect(restoredRepo.pushedAt.getTime()).toBe(pushedAt.getTime())
  })

  test('does not revive a date-like substring that is not itself a full ISO timestamp', () => {
    const repo: Repo = { ...REPO_BASE, pushedAt: new Date('2026-09-18T09:18:04.000Z') }

    const restored = persistAndRestore(repo)
    const restoredRepo = restored.clientState.queries[0]?.state.data as Repo

    expect(typeof restoredRepo.description).toBe('string')
    expect(restoredRepo.description).toBe(REPO_BASE.description)
  })
})
