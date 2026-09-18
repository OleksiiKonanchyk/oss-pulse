import { formatCompact, pluralize } from './format'

test.each([
  [999, '999'],
  [1000, '1k'],
  [1234, '1.2k'],
  [999_949, '999.9k'],
  [999_999, '1M'],
  [1_000_000, '1M'],
  [1_500_000, '1.5M'],
])('formatCompact(%i) === %s', (value, expected) => {
  expect(formatCompact(value)).toBe(expected)
})

test('pluralize keeps a count of one singular', () => {
  expect(pluralize(1, 'week')).toBe('1 week')
  expect(pluralize(0, 'week')).toBe('0 weeks')
  expect(pluralize(12, 'week')).toBe('12 weeks')
})

test('pluralize takes an irregular plural when the noun needs one', () => {
  expect(pluralize(2, 'repository', 'repositories')).toBe('2 repositories')
})
