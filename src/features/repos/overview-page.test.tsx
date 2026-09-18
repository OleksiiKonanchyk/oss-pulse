import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse, delay } from 'msw'
import { server } from '../../../test/msw/server'
import { OverviewPage } from './overview-page'

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
