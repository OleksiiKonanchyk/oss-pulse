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
