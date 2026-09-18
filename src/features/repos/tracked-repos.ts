import { writeJson } from '../../lib/storage'

const KEY = 'oss-pulse:tracked-repos'

/** Recognisable, high-activity repositories so a first visit is never blank. */
export const DEFAULT_TRACKED_REPOS = Object.freeze([
  'facebook/react',
  'vercel/next.js',
  'rails/rails',
])

type Listener = () => void
const listeners = new Set<Listener>()

// Cache for snapshot stability: track raw string and parsed array to avoid reparsing
let cachedRawString: string | null | undefined = undefined
let cachedParsedRepos: string[] | null = null

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

export function getTrackedRepos(): string[] {
  const raw = localStorage.getItem(KEY)

  // Return cached snapshot if raw string hasn't changed
  if (raw === cachedRawString && cachedParsedRepos !== null) {
    return cachedParsedRepos
  }

  // Parse fresh or return defaults
  let parsed: string[]
  if (raw === null) {
    parsed = DEFAULT_TRACKED_REPOS as string[]
  } else {
    try {
      const value = JSON.parse(raw)
      if (isStringArray(value)) {
        parsed = value
      } else {
        parsed = DEFAULT_TRACKED_REPOS as string[]
      }
    } catch {
      parsed = DEFAULT_TRACKED_REPOS as string[]
    }
  }

  // Update cache
  cachedRawString = raw
  cachedParsedRepos = parsed

  return parsed
}

function save(repos: string[]): void {
  writeJson(KEY, repos)
  // Invalidate cache on mutation
  cachedRawString = undefined
  cachedParsedRepos = null
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
