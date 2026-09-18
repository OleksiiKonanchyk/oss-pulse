import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

const ONE_HOUR = 3_600_000

/**
 * Unauthenticated callers get 60 requests an hour, so the cache is the product,
 * not an optimisation. Repository metadata changes slowly; treating it as fresh
 * for an hour is correct rather than a workaround.
 *
 * Retries are off because the failure that matters here — an exhausted quota —
 * is made worse by retrying, and the UI has a real screen for it.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: ONE_HOUR,
      gcTime: 24 * ONE_HOUR,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})

// Derived from the function we already import, rather than reaching for
// `@tanstack/query-persist-client-core` (a transitive dependency this package
// never declares directly) just to name the same type.
type PersisterOptions = Parameters<typeof createSyncStoragePersister>[0]
type Deserialize = NonNullable<PersisterOptions['deserialize']>
type PersistedCache = Deserialize extends (cachedString: string) => infer TResult ? TResult : never

/**
 * `createSyncStoragePersister` round-trips the whole query cache through
 * `JSON.stringify`/`JSON.parse` by default. `JSON.stringify` calls
 * `Date#toJSON`, which quietly turns every `Date` field (`Repo.pushedAt`,
 * `Issue.createdAt`, `CommitWeek.weekStart`) into an ISO-8601 string — and
 * plain `JSON.parse` never turns it back. The domain types are right to use
 * `Date`; what's broken is the persistence boundary, so the fix lives here
 * once instead of in every consumer that calls a `Date` method on restored
 * data.
 *
 * Anchored start-to-end so only a value that IS an ISO-8601 timestamp (what
 * `Date#toJSON` produces, e.g. "2026-09-18T09:18:04.000Z") gets revived. A
 * repo description or issue title that merely contains a date-shaped
 * substring will not match this pattern and survives untouched.
 */
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

function reviveDates(_key: string, value: unknown): unknown {
  return typeof value === 'string' && ISO_DATE_PATTERN.test(value) ? new Date(value) : value
}

export function serializeCache(persistedClient: PersistedCache): string {
  return JSON.stringify(persistedClient)
}

export function deserializeCache(cachedString: string): PersistedCache {
  return JSON.parse(cachedString, reviveDates) as unknown as PersistedCache
}

export function createPersister() {
  return createSyncStoragePersister({
    storage: window.localStorage,
    key: 'oss-pulse:query-cache',
    serialize: serializeCache,
    deserialize: deserializeCache,
  })
}
