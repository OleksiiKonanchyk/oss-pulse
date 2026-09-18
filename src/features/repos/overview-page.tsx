import { EmptyState } from '../../components/empty-state'
import { AddRepoForm } from './add-repo-form'
import { RepoRow } from './repo-row'
import { useTrackedRepos } from './use-tracked-repos'

export function OverviewPage() {
  const { repos, untrack } = useTrackedRepos()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Tracked repositories</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Activity and issue load across the projects you follow.
          </p>
        </div>
        <AddRepoForm />
      </div>

      {repos.length === 0 ? (
        <EmptyState
          title="Nothing tracked yet"
          description="Add a repository by owner and name to start following it."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left">
            <caption className="sr-only">Tracked repositories and their current activity</caption>
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">Repository</th>
                <th scope="col" className="px-4 py-3">Stars</th>
                <th scope="col" className="px-4 py-3">Open issues</th>
                <th scope="col" className="px-4 py-3">Last push</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {repos.map((fullName) => (
                <RepoRow key={fullName} fullName={fullName} onUntrack={() => untrack(fullName)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
