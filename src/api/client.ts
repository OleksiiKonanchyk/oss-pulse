import { classifyResponse, GitHubError } from './errors'
import { parseLinkHeader, type PageLinks } from './link-header'
import { publishRateLimit, readRateLimit, type RateLimit } from './rate-limit'

const BASE_URL = 'https://api.github.com'

export type GitHubResponse<T> = {
  data: T
  links: PageLinks
  rateLimit: RateLimit | null
}

export type FetchOptions = {
  token?: string | null
  signal?: AbortSignal
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (text.length === 0) return null

  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

/**
 * The single point where this app talks HTTP. Absolute URLs are accepted so that
 * a `Link` header URL can be followed directly without re-deriving its query.
 */
export async function githubFetch<T>(
  path: string,
  { token, signal }: FetchOptions = {},
): Promise<GitHubResponse<T>> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(url, { headers, signal })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new GitHubError({ kind: 'network' })
  }

  const rateLimit = readRateLimit(response.headers)
  if (rateLimit) publishRateLimit(rateLimit)

  const body = await readBody(response)

  if (!response.ok) throw new GitHubError(classifyResponse(response, body))

  return {
    data: body as T,
    links: parseLinkHeader(response.headers.get('link')),
    rateLimit,
  }
}
