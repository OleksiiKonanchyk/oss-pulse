import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
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
  expect(await screen.findByText(/unavailable/i)).toBeInTheDocument()
})
