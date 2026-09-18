import { render, screen } from '@testing-library/react'
import { CommitActivityChart } from './commit-activity-chart'

const weeks = [
  { weekStart: new Date('2026-08-02T00:00:00Z'), total: 10 },
  { weekStart: new Date('2026-08-09T00:00:00Z'), total: 20 },
  { weekStart: new Date('2026-08-16T00:00:00Z'), total: 0 },
]

test('summarises the chart for screen readers', () => {
  render(<CommitActivityChart weeks={weeks} />)

  const figure = screen.getByRole('img', { name: /commit activity/i })
  expect(figure).toHaveAccessibleName(/30 commits/i)
})

test('reports when GitHub is still computing statistics', () => {
  render(<CommitActivityChart weeks="computing" />)
  expect(screen.getByText(/still computing/i)).toBeInTheDocument()
})

test('reports an empty history rather than drawing an empty chart', () => {
  render(<CommitActivityChart weeks={[]} />)
  expect(screen.getByText(/no commit activity/i)).toBeInTheDocument()
})
