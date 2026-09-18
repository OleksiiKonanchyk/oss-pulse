import { readJson, writeJson } from '../../lib/storage'

const KEY = 'oss-pulse:tracked-repos'

/** Recognisable, high-activity repositories so a first visit is never blank. */
export const DEFAULT_TRACKED_REPOS = ['facebook/react', 'vercel/next.js', 'rails/rails']

type Listener = () => void
const listeners = new Set<Listener>()

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

export function getTrackedRepos(): string[] {
  const stored = readJson<unknown>(KEY, null)
  if (stored === null) return DEFAULT_TRACKED_REPOS
  if (!isStringArray(stored)) return DEFAULT_TRACKED_REPOS

  return stored
}

function save(repos: string[]): void {
  writeJson(KEY, repos)
  for (const listener of listeners) listener()
}

export function trackRepo(fullName: string): void {
  const repos = getTrackedRepos()
  const exists = repos.some((name) => name.toLowerCase() === fullName.toLowerCase())
  if (exists) return

  save([...repos, fullName])
}

export function untrackRepo(fullName: string): void {
  const repos = getTrackedRepos().filter(
    (name) => name.toLowerCase() !== fullName.toLowerCase(),
  )

  save(repos)
}

export function subscribeToTrackedRepos(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
