import { useParams } from 'react-router-dom'
import { Card } from '../../components/card'
import { ErrorState } from '../../components/error-state'
import { Skeleton } from '../../components/skeleton'
import { useCommitActivity, useRepo } from '../../queries/use-github-queries'
import { IssuesPanel } from '../issues/issues-panel'
import { CommitActivityChart } from './commit-activity-chart'
import { ContributorsCard } from './contributors-card'
import { RepoHeader } from './repo-header'

/**
 * Both status regions here are rendered unconditionally, ahead of the state they describe,
 * for the reason spelled out in RepoRow: a live region that already exists when its text
 * changes is reliably announced; one created at the moment of the change often is not.
 * `Skeleton` is decorative and says nothing itself, so a load is announced exactly once.
 */
export function RepoPage() {
  const { owner, name } = useParams()
  const fullName = `${owner}/${name}`

  const repo = useRepo(fullName)
  const activity = useCommitActivity(fullName)

  const repoStatus = repo.isPending
    ? `Loading ${fullName}`
    : repo.isError
      ? `${fullName} failed to load`
      : ''

  const activityStatus = activity.isPending
    ? 'Loading commit activity'
    : activity.isError
      ? 'Commit activity failed to load'
      : ''

  return (
    <div className="space-y-6" aria-busy={repo.isPending}>
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="repo-status"
        className="sr-only"
      >
        {repoStatus}
      </span>

      {repo.isPending ? (
        <Skeleton rows={6} />
      ) : repo.isError ? (
        <ErrorState error={repo.error} onRetry={() => repo.refetch()} />
      ) : (
        <>
          <RepoHeader repo={repo.data} />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card title="Commit activity, last 52 weeks">
                <span
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  data-testid="commit-activity-status"
                  className="sr-only"
                >
                  {activityStatus}
                </span>

                {activity.isPending ? (
                  <Skeleton rows={3} />
                ) : activity.isError ? (
                  <ErrorState error={activity.error} onRetry={() => activity.refetch()} />
                ) : (
                  <CommitActivityChart weeks={activity.data} />
                )}
              </Card>
            </div>
            <ContributorsCard fullName={fullName} />
          </div>

          <IssuesPanel fullName={fullName} />
        </>
      )}
    </div>
  )
}
