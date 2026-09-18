import { formatCompact } from './format'

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
