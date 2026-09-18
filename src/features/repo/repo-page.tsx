import { useParams } from 'react-router-dom'
import { Card } from '../../components/card'
import { ErrorState } from '../../components/error-state'
import { Skeleton } from '../../components/skeleton'
import { useCommitActivity, useRepo } from '../../queries/use-github-queries'
import { IssuesPanel } from '../issues/issues-panel'
import { CommitActivityChart } from './commit-activity-chart'
import { ContributorsCard } from './contributors-card'
import { RepoHeader } from './repo-header'

export function RepoPage() {
  const { owner, name } = useParams()
  const fullName = `${owner}/${name}`

  const repo = useRepo(fullName)
  const activity = useCommitActivity(fullName)

  if (repo.isPending) return <Skeleton rows={6} />
  if (repo.isError) return <ErrorState error={repo.error} onRetry={() => repo.refetch()} />

  return (
    <div className="space-y-6">
      <RepoHeader repo={repo.data} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Commit activity, last 52 weeks">
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
    </div>
  )
}
