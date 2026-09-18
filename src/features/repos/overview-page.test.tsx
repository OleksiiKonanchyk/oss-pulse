import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse, delay } from 'msw'
import { beforeEach } from 'vitest'
import { server } from '../../../test/msw/server'
import { OverviewPage } from './overview-page'

const COMMIT_ACTIVITY_URL = 'https://api.github.com/repos/:owner/:name/stats/commit_activity'

// Every row draws a sparkline, so every row asks for commit activity. Tests that are not
// about the sparkline stub it empty; a `server.use` inside a test still takes precedence.
beforeEach(() => {
  server.use(http.get(COMMIT_ACTIVITY_URL, () => HttpResponse.json([])))
})

function commitWeeks(totals: number[]) {
  const start = Date.UTC(2026, 5, 1) / 1000

  return totals.map((total, index) => ({
    week: start + index * 604_800,
    total,
    days: [total, 0, 0, 0, 0, 0, 0],
  }))
}

/** The repository name link in each body row, in the order the rows are rendered. */
function renderedOrder(): string[] {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getByRole('link').textContent ?? '')
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function repoPayload(fullName: string, stars: number) {
  return {
    full_name: fullName,
    description: 'A repository',
    stargazers_count: stars,
    forks_count: 1,
    open_issues_count: 2,
    language: 'TypeScript',
    pushed_at: new Date().toISOString(),
    html_url: `https://github.com/${fullName}`,
    license: { spdx_id: 'MIT' },
  }
}

test('lists the seeded repositories with their stars', async () => {
  server.use(
    http.get('https://api.github.com/repos/:owner/:name', ({ params }) =>
      HttpResponse.json(repoPayload(`${params.owner}/${params.name}`, 1234)),
    ),
  )

  renderPage()

  expect(await screen.findByText('facebook/react')).toBeInTheDocument()
  expect(await screen.findByText('vercel/next.js')).toBeInTheDocument()
  expect((await screen.findAllByText('1.2k')).length).toBeGreaterThan(0)
})

test('shows a table with accessible column headers', async () => {
  server.use(
    http.get('https://api.github.com/repos/:owner/:name', ({ params }) =>
      HttpResponse.json(repoPayload(`${params.owner}/${params.name}`, 10)),
    ),
  )

  renderPage()

  expect(await screen.findByRole('columnheader', { name: /repository/i })).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: /stars/i })).toBeInTheDocument()
})

test('a failing repository row does not blank the page', async () => {
  server.use(
    http.get('https://api.github.com/repos/facebook/react', () =>
      HttpResponse.json({ message: 'Not Found' }, { status: 404 }),
    ),
    http.get('https://api.github.com/repos/:owner/:name', ({ params }) =>
      HttpResponse.json(repoPayload(`${params.owner}/${params.name}`, 5)),
    ),
  )

  renderPage()

  expect(await screen.findByText('vercel/next.js')).toBeInTheDocument()
  // The failed row also has a screen-reader-only status-region echo of "unavailable" (see
  // the tests below), so exclude it explicitly — this must prove the *visible* cell text
  // renders, not just that some element somewhere contains the word.
  expect(
    await screen.findByText(/unavailable/i, { ignore: 'script, style, .sr-only' }),
  ).toBeInTheDocument()
})

/**
 * The rate-limit screen is this project's signature state, and on a public demo sharing a
 * 60-requests-per-hour IP budget it is a likely first impression — so it has to be
 * reachable from the landing page, not only from a detail route.
 */
test('an exhausted quota renders the designed rate-limit screen above the table', async () => {
  server.use(
    http.get('https://api.github.com/repos/:owner/:name', () =>
      HttpResponse.json(
        { message: 'API rate limit exceeded' },
        {
          status: 403,
          headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1800000000' },
        },
      ),
    ),
  )

  renderPage()

  expect(await screen.findByRole('heading', { name: /rate limit/i })).toBeInTheDocument()
  // Named once for the whole table, not once per row.
  expect(screen.getAllByRole('alert')).toHaveLength(1)
  // And the table itself is still there underneath.
  expect(screen.getByRole('columnheader', { name: /repository/i })).toBeInTheDocument()
})

test('a whole table failing the same non-quota way is also named once', async () => {
  server.use(
    http.get('https://api.github.com/repos/:owner/:name', () =>
      HttpResponse.json({ message: 'Not Found' }, { status: 404 }),
    ),
  )

  renderPage()

  expect(await screen.findByRole('heading', { name: /not found/i })).toBeInTheDocument()
  expect(screen.getAllByRole('alert')).toHaveLength(1)
})

test('a mixed set of failures stays per-row and shows no whole-table error', async () => {
  server.use(
    http.get('https://api.github.com/repos/facebook/react', () =>
      HttpResponse.json({ message: 'Not Found' }, { status: 404 }),
    ),
    http.get('https://api.github.com/repos/:owner/:name', ({ params }) =>
      HttpResponse.json(repoPayload(`${params.owner}/${params.name}`, 5)),
    ),
  )

  renderPage()

  await screen.findByText('vercel/next.js')
  await waitFor(() =>
    expect(
      screen.getByText(/unavailable/i, { ignore: 'script, style, .sr-only' }),
    ).toBeInTheDocument(),
  )
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('a pending row exposes a busy state to assistive technology', () => {
  server.use(
    http.get('https://api.github.com/repos/:owner/:name', async ({ params }) => {
      await delay('infinite')
      return HttpResponse.json(repoPayload(`${params.owner}/${params.name}`, 5))
    }),
  )

  renderPage()

  expect(screen.getByText('Loading facebook/react')).toBeInTheDocument()
  expect(screen.getByText('Loading vercel/next.js')).toBeInTheDocument()
})

test('a failed row announces unavailability rather than silently swapping text', async () => {
  server.use(
    http.get('https://api.github.com/repos/facebook/react', () =>
      HttpResponse.json({ message: 'Not Found' }, { status: 404 }),
    ),
    http.get('https://api.github.com/repos/:owner/:name', ({ params }) =>
      HttpResponse.json(repoPayload(`${params.owner}/${params.name}`, 5)),
    ),
  )

  renderPage()

  // Every row carries a persistent role="status" live region (see the next test for why),
  // so target the failing row's specifically rather than assuming there is only one.
  const status = screen.getByTestId('row-status-facebook/react')
  expect(status).toHaveAttribute('role', 'status')
  await waitFor(() => expect(status).toHaveTextContent(/unavailable/i))
})

test('the live status region persists across the pending-to-resolved transition', async () => {
  // A live region that already exists when its text changes is reliably announced by
  // assistive technology; one that is unmounted and recreated at the moment of the change
  // often is not, because the AT never observes a transition. @testing-library/react can't
  // observe *announcement* timing, but it can prove the structural property that makes
  // announcement possible: the DOM node itself must be the same node before and after.
  server.use(
    http.get('https://api.github.com/repos/:owner/:name', async ({ params }) => {
      await delay(20)
      return HttpResponse.json(repoPayload(`${params.owner}/${params.name}`, 5))
    }),
  )

  renderPage()

  const pendingNode = screen.getByTestId('row-status-facebook/react')
  expect(pendingNode).toHaveTextContent(/loading/i)

  await screen.findByText('facebook/react')

  const resolvedNode = screen.getByTestId('row-status-facebook/react')
  expect(resolvedNode).toBe(pendingNode)
  expect(resolvedNode).not.toHaveTextContent(/loading/i)
})

test('each row draws a sparkline of its recent commit activity', async () => {
  server.use(
    http.get(COMMIT_ACTIVITY_URL, () => HttpResponse.json(commitWeeks([3, 0, 7, 2]))),
    http.get('https://api.github.com/repos/:owner/:name', ({ params }) =>
      HttpResponse.json(repoPayload(`${params.owner}/${params.name}`, 10)),
    ),
  )

  renderPage()

  await waitFor(() =>
    expect(screen.getAllByRole('img', { name: /commits in the last/i })).toHaveLength(3),
  )
  // The text alternative carries the number, so the chart is not visual-only.
  const [first] = screen.getAllByRole('img', { name: /commits in the last/i })
  expect(first).toHaveAccessibleName('12 commits in the last 4 weeks')
})

test('a row whose repository failed spends no request on its sparkline', async () => {
  const activityRequests: string[] = []
  server.use(
    http.get(COMMIT_ACTIVITY_URL, ({ params }) => {
      activityRequests.push(`${params.owner}/${params.name}`)
      return HttpResponse.json([])
    }),
    http.get('https://api.github.com/repos/facebook/react', () =>
      HttpResponse.json({ message: 'Not Found' }, { status: 404 }),
    ),
    http.get('https://api.github.com/repos/:owner/:name', ({ params }) =>
      HttpResponse.json(repoPayload(`${params.owner}/${params.name}`, 5)),
    ),
  )

  renderPage()

  await screen.findByText('vercel/next.js')
  await waitFor(() => expect(activityRequests).toHaveLength(2))
  expect(activityRequests).not.toContain('facebook/react')
})

describe('column sorting', () => {
  const STARS: Record<string, number> = {
    'facebook/react': 100,
    'vercel/next.js': 300,
    'rails/rails': 200,
  }

  function stubRepos() {
    server.use(
      http.get('https://api.github.com/repos/:owner/:name', ({ params }) => {
        const fullName = `${params.owner}/${params.name}`
        return HttpResponse.json(repoPayload(fullName, STARS[fullName] ?? 0))
      }),
    )
  }

  test('rows start in name order and re-order when a column is chosen', async () => {
    stubRepos()
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('rails/rails')
    expect(renderedOrder()).toEqual(['facebook/react', 'rails/rails', 'vercel/next.js'])

    await user.click(screen.getByRole('button', { name: /stars/i }))
    expect(renderedOrder()).toEqual(['vercel/next.js', 'rails/rails', 'facebook/react'])
  })

  test('clicking the active column reverses it', async () => {
    stubRepos()
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('rails/rails')
    await user.click(screen.getByRole('button', { name: /stars/i }))
    await user.click(screen.getByRole('button', { name: /stars/i }))

    expect(renderedOrder()).toEqual(['facebook/react', 'rails/rails', 'vercel/next.js'])
  })

  test('the sorted column reports its direction through aria-sort', async () => {
    stubRepos()
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('rails/rails')
    expect(screen.getByRole('columnheader', { name: /repository/i })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )

    await user.click(screen.getByRole('button', { name: /stars/i }))

    expect(screen.getByRole('columnheader', { name: /stars/i })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
    expect(screen.getByRole('columnheader', { name: /repository/i })).toHaveAttribute(
      'aria-sort',
      'none',
    )
  })
})
