import { classifyResponse, GitHubError, isApiError } from './errors'

function response(status: number, headers: Record<string, string> = {}): Response {
  return new Response(null, { status, headers })
}

test('classifies an exhausted rate limit with its reset time', () => {
  const resetSeconds = 1_800_000_000
  const result = classifyResponse(
    response(403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(resetSeconds) }),
    {},
  )

  expect(result.kind).toBe('rate-limited')
  if (result.kind !== 'rate-limited') throw new Error('expected rate-limited')
  expect(result.resetAt).toEqual(new Date(resetSeconds * 1000))
})

test('classifies a 429 with no remaining requests as rate limited', () => {
  const result = classifyResponse(
    response(429, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1800000000' }),
    {},
  )
  expect(result.kind).toBe('rate-limited')
})

test('classifies a 403 with requests remaining as unknown, not rate limited', () => {
  const result = classifyResponse(
    response(403, { 'x-ratelimit-remaining': '42' }),
    { message: 'Forbidden' },
  )

  expect(result.kind).toBe('unknown')
  if (result.kind !== 'unknown') throw new Error('expected unknown')
  expect(result.status).toBe(403)
  expect(result.message).toBe('Forbidden')
})

test('classifies 404 as not-found', () => {
  expect(classifyResponse(response(404), {}).kind).toBe('not-found')
})

test('falls back to the status text when the body carries no message', () => {
  const result = classifyResponse(response(500), {})
  expect(result.kind).toBe('unknown')
  if (result.kind !== 'unknown') throw new Error('expected unknown')
  expect(result.status).toBe(500)
  expect(result.message).not.toBe('')
})

test('rate limited without a reset header falls back to one hour ahead', () => {
  const before = Date.now()
  const result = classifyResponse(response(403, { 'x-ratelimit-remaining': '0' }), {})

  expect(result.kind).toBe('rate-limited')
  if (result.kind !== 'rate-limited') throw new Error('expected rate-limited')
  expect(result.resetAt.getTime()).toBeGreaterThanOrEqual(before + 3_600_000 - 1000)
})

test('isApiError recognises GitHubError and rejects other errors', () => {
  expect(isApiError(new GitHubError({ kind: 'not-found' }))).toBe(true)
  expect(isApiError(new Error('boom'))).toBe(false)
  expect(isApiError(null)).toBe(false)
})

/**
 * GitHub's *secondary* rate limit — the one that fires on bursts rather than on the hourly
 * budget — answers 403 with `retry-after` and no `x-ratelimit-remaining` at all. Filing it
 * as an unknown error means telling the user "something went wrong" about the one failure
 * that clears itself in under a minute.
 */
test('classifies a secondary rate limit (retry-after, no remaining header) as rate limited', () => {
  const before = Date.now()
  const result = classifyResponse(
    response(403, { 'retry-after': '60' }),
    { message: 'You have exceeded a secondary rate limit' },
  )

  expect(result.kind).toBe('rate-limited')
  if (result.kind !== 'rate-limited') throw new Error('expected rate-limited')
  expect(result.resetAt.getTime()).toBeGreaterThanOrEqual(before + 59_000)
  expect(result.resetAt.getTime()).toBeLessThanOrEqual(Date.now() + 60_000)
})

test('reads retry-after in its HTTP-date form as well as its seconds form', () => {
  const retryAt = new Date('2026-09-18T12:00:00.000Z')
  const result = classifyResponse(
    response(429, { 'retry-after': retryAt.toUTCString() }),
    {},
  )

  expect(result.kind).toBe('rate-limited')
  if (result.kind !== 'rate-limited') throw new Error('expected rate-limited')
  expect(result.resetAt.getTime()).toBe(retryAt.getTime())
})

test('an exhausted quota still wins over retry-after, keeping the real reset time', () => {
  const resetSeconds = 1_800_000_000
  const result = classifyResponse(
    response(403, {
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': String(resetSeconds),
      'retry-after': '5',
    }),
    {},
  )

  expect(result.kind).toBe('rate-limited')
  if (result.kind !== 'rate-limited') throw new Error('expected rate-limited')
  expect(result.resetAt).toEqual(new Date(resetSeconds * 1000))
})

test('an unparseable retry-after leaves an ordinary 403 classified as unknown', () => {
  expect(classifyResponse(response(403, { 'retry-after': 'soon' }), {}).kind).toBe('unknown')
  expect(classifyResponse(response(403, { 'retry-after': '' }), {}).kind).toBe('unknown')
  expect(classifyResponse(response(403, { 'retry-after': '0' }), {}).kind).toBe('unknown')
})
