import type { Repo } from '../../api/types'
import { formatCompact, formatRelativeDate } from '../../lib/format'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  )
}

export function RepoHeader({ repo }: { repo: Repo }) {
  return (
    <header className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold">
          <a
            href={repo.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 hover:underline"
          >
            {repo.fullName}
          </a>
        </h1>
        {repo.description && (
          <p className="mt-1 text-slate-600 dark:text-slate-400">{repo.description}</p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Stars" value={formatCompact(repo.stars)} />
        <Stat label="Forks" value={formatCompact(repo.forks)} />
        <Stat label="Open issues" value={formatCompact(repo.openIssues)} />
        <Stat label="Language" value={repo.language ?? '—'} />
        <Stat label="License" value={repo.license ?? '—'} />
        <Stat label="Last push" value={formatRelativeDate(repo.pushedAt)} />
      </dl>
    </header>
  )
}
