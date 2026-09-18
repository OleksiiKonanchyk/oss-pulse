import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '../../../test/msw/server'
import { IssuesPanel } from './issues-panel'

function issue(number: number, title: string) {
  return {
    number, title, state: 'open', user: { login: 'ann' }, labels: [],
    comments: 0, created_at: '2026-09-01T00:00:00Z',
    html_url: `https://github.com/a/b/issues/${number}`,
  }
}

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <IssuesPanel fullName="a/b" />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

test('renders issues in a table', async () => {
  server.use(
    http.get('https://api.github.com/repos/a/b/issues', () =>
      HttpResponse.json([issue(1, 'First problem')]),
    ),
  )

  renderPanel()
  expect(await screen.findByText('First problem')).toBeInTheDocument()
})

test('shows an empty state when a filter matches nothing', async () => {
  server.use(http.get('https://api.github.com/repos/a/b/issues', () => HttpResponse.json([])))

  renderPanel()
  expect(await screen.findByText(/no issues match/i)).toBeInTheDocument()
})

test('shows the rate-limit screen when quota is exhausted', async () => {
  server.use(
    http.get('https://api.github.com/repos/a/b/issues', () =>
      HttpResponse.json({ message: 'rate limit exceeded' }, {
        status: 403,
        headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1800000000' },
      }),
    ),
  )

  renderPanel()
  expect(await screen.findByRole('heading', { name: /rate limit/i })).toBeInTheDocument()
})

test('next is disabled on the last page', async () => {
  server.use(
    http.get('https://api.github.com/repos/a/b/issues', () =>
      HttpResponse.json([issue(1, 'Only page')]),
    ),
  )

  renderPanel()
  expect(await screen.findByRole('button', { name: /next/i })).toBeDisabled()
})

test('changing the state filter refetches with the new state', async () => {
  const requested: string[] = []
  server.use(
    http.get('https://api.github.com/repos/a/b/issues', ({ request }) => {
      requested.push(new URL(request.url).searchParams.get('state') ?? '')
      return HttpResponse.json([issue(1, 'A')])
    }),
  )

  const user = userEvent.setup()
  renderPanel()

  await screen.findByText('A')
  await user.selectOptions(screen.getByLabelText(/state/i), 'closed')

  await screen.findByText('A')
  expect(requested).toContain('closed')
})

// The `disabled` test above only exercises a response with no Link header, which is the
// same as `hasNextPage` never being wired at all — it would pass identically either way.
// This is the complementary case: a real "next" relation must flip the button to enabled.
test('next is enabled when the response has another page', async () => {
  server.use(
    http.get('https://api.github.com/repos/a/b/issues', () =>
      HttpResponse.json([issue(1, 'First of many')], {
        headers: { Link: '<https://api.github.com/repos/a/b/issues?page=2>; rel="next"' },
      }),
    ),
  )

  renderPanel()

  // The Next button exists (disabled) before data arrives, so `findByRole` alone would
  // resolve on that initial render and pass vacuously — wait for the row first.
  await screen.findByText('First of many')
  expect(screen.getByRole('button', { name: /next/i })).toBeEnabled()
})

/**
 * `useIssues` keeps the previous rows on screen while refetching (`placeholderData`), so
 * the swap to new rows is otherwise silent to assistive technology. This proves the
 * structural property that makes the announcement possible — the same `role="status"`
 * node persists across the change, per the pattern in overview-page.test.tsx — and that
 * its text distinguishes the new filter/count from the old one.
 */
test('the live status region persists across a filter change and announces the new result', async () => {
  server.use(
    http.get('https://api.github.com/repos/a/b/issues', ({ request }) => {
      const state = new URL(request.url).searchParams.get('state') ?? 'open'
      return HttpResponse.json(
        state === 'closed'
          ? [issue(1, 'Closed one'), issue(2, 'Closed two')]
          : [issue(1, 'Open one')],
      )
    }),
  )

  const user = userEvent.setup()
  renderPanel()

  await screen.findByText('Open one')
  const beforeStatus = screen.getByTestId('issues-status')
  expect(beforeStatus).toHaveTextContent(/1 open issue,/i)

  await user.selectOptions(screen.getByLabelText(/state/i), 'closed')

  await screen.findByText('Closed one')
  const afterStatus = screen.getByTestId('issues-status')
  expect(afterStatus).toBe(beforeStatus)
  expect(afterStatus).toHaveTextContent(/2 closed issues,/i)
})

/**
 * The card used to be headed "Issues opened per week", which reads as a property of the
 * repository. It is fed `data.issues` — one page of 25 rows, under the current filters —
 * so it rewrote its own meaning silently every time the reader paged or filtered.
 */
test('the throughput card names the scope it actually charts', async () => {
  server.use(
    http.get('https://api.github.com/repos/a/b/issues', () =>
      HttpResponse.json([issue(1, 'First problem')]),
    ),
  )

  renderPanel()

  await screen.findByText('First problem')
  expect(
    screen.getByRole('heading', { name: /issues on this page, by week opened/i }),
  ).toBeInTheDocument()
})
