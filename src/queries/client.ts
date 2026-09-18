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

export function createPersister() {
  return createSyncStoragePersister({
    storage: window.localStorage,
    key: 'oss-pulse:query-cache',
  })
}
