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
