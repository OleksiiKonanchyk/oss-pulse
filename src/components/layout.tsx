import { Link, Outlet } from 'react-router-dom'
import { RateLimitBadge } from './rate-limit-badge'
import { ThemeToggle } from './theme-toggle'

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="text-lg font-semibold">
            OSS Pulse
          </Link>
          <div className="flex items-center gap-4">
            <RateLimitBadge />
            <Link to="/settings" className="text-sm underline-offset-4 hover:underline">
              Settings
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
