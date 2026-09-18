import { parseLinkHeader } from './link-header'

test('returns an empty object when the header is absent', () => {
  expect(parseLinkHeader(null)).toEqual({})
})

test('returns an empty object for an empty header', () => {
  expect(parseLinkHeader('')).toEqual({})
})

test('parses next and last from a first page response', () => {
  const header =
    '<https://api.github.com/repositories/10270250/issues?page=2>; rel="next", ' +
    '<https://api.github.com/repositories/10270250/issues?page=37>; rel="last"'

  expect(parseLinkHeader(header)).toEqual({
    next: 'https://api.github.com/repositories/10270250/issues?page=2',
    last: 'https://api.github.com/repositories/10270250/issues?page=37',
  })
})

test('parses all four relations from a middle page response', () => {
  const header =
    '<https://api.github.com/repos/a/b/issues?page=1>; rel="first", ' +
    '<https://api.github.com/repos/a/b/issues?page=2>; rel="prev", ' +
    '<https://api.github.com/repos/a/b/issues?page=4>; rel="next", ' +
    '<https://api.github.com/repos/a/b/issues?page=9>; rel="last"'

  const links = parseLinkHeader(header)

  expect(links.first).toBe('https://api.github.com/repos/a/b/issues?page=1')
  expect(links.prev).toBe('https://api.github.com/repos/a/b/issues?page=2')
  expect(links.next).toBe('https://api.github.com/repos/a/b/issues?page=4')
  expect(links.last).toBe('https://api.github.com/repos/a/b/issues?page=9')
})

test('ignores relations it does not recognise', () => {
  const header = '<https://api.github.com/x>; rel="https://docs.github.com/rel/unknown"'
  expect(parseLinkHeader(header)).toEqual({})
})

test('tolerates irregular whitespace', () => {
  const header = '<https://api.github.com/x?page=2>;rel="next"'
  expect(parseLinkHeader(header)).toEqual({ next: 'https://api.github.com/x?page=2' })
})
