import { useSyncExternalStore } from 'react'
import {
  getTrackedRepos,
  subscribeToTrackedRepos,
  trackRepo,
  untrackRepo,
} from './tracked-repos'

export function useTrackedRepos() {
  const repos = useSyncExternalStore(subscribeToTrackedRepos, getTrackedRepos)

  return { repos, track: trackRepo, untrack: untrackRepo }
}
