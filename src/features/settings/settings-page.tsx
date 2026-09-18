import { useId, useState } from 'react'
import { Card } from '../../components/card'
import { ThemeToggle } from '../../components/theme-toggle'
import { queryClient } from '../../queries/client'
import { getToken, setToken, useToken } from '../../lib/token'

const QUERY_CACHE_KEY = 'oss-pulse:query-cache'

function clearCachedData(): void {
  queryClient.clear()
  window.localStorage.removeItem(QUERY_CACHE_KEY)
}

export function SettingsPage() {
  const savedToken = useToken()
  const [draftToken, setDraftToken] = useState(() => getToken() ?? '')
  const tokenFieldId = useId()

  function handleSave() {
    setToken(draftToken.length > 0 ? draftToken : null)
  }

  function handleClear() {
    setToken(null)
    setDraftToken('')
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <Card title="Personal access token">
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor={tokenFieldId} className="block text-sm font-medium">
              Personal access token
            </label>
            <input
              id={tokenFieldId}
              type="password"
              autoComplete="off"
              value={draftToken}
              onChange={(event) => setDraftToken(event.target.value)}
              className="mt-1 w-full max-w-sm rounded border border-slate-300 px-3 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded bg-slate-900 px-4 py-1.5 font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:bg-slate-100 dark:text-slate-900"
            >
              Save token
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={savedToken === null && draftToken.length === 0}
              className="rounded border border-slate-300 px-4 py-1.5 font-medium disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:border-slate-700"
            >
              Clear token
            </button>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400">
            Your token stays in your browser (in <code>localStorage</code>) and is sent only to{' '}
            <code>api.github.com</code>. It needs no scopes for public data, and raises the rate
            limit from 60 to 5,000 requests per hour.
          </p>

          <p className="text-sm">
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noreferrer"
              className="underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              Create a token on GitHub
            </a>
          </p>
        </div>
      </Card>

      <Card title="Appearance">
        <ThemeToggle />
      </Card>

      <Card title="Cached data">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Cached responses are what keep this app working within the anonymous rate limit.
            Clearing the cache forces fresh requests against your remaining quota.
          </p>
          <div>
            <button
              type="button"
              onClick={clearCachedData}
              className="rounded border border-slate-300 px-4 py-1.5 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:border-slate-700"
            >
              Clear cached data
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}
