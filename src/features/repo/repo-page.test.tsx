import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http, HttpResponse, delay } from 'msw'
import { beforeEach } from 'vitest'
import { server } from '../../../test/msw/server'
import { RepoPage } from './repo-page'

const REPO_URL = 'https://api.github.com/repos/a/b'

function repoPayload() {
  return {
    full_name: 'a/b',
    description: 'A repository',
    stargazers_count: 10,
    forks_count: 1,
    open_issues_count: 2,
    language: 'TypeScript',
    pushed_at: '2026-09-01T00:00:00Z',
    html_url: 'https://github.com/a/b',
    license: { spdx_id: 'MIT' },
  }
}

// The detail page fans out to four endpoints; individual tests override the one they care
// about and leave the rest answering emptily.
beforeEach(() => {
  server.use(
    http.get(REPO_URL, () => HttpResponse.json(repoPayload())),
    http.get(`${REPO_URL}/stats/commit_activity`, () => HttpResponse.json([])),
    http.get(`${REPO_URL}/contributors`, () => HttpResponse.json([])),
    http.get(`${REPO_URL}/issues`, () => HttpResponse.json([])),
  )
})

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/repo/a/b']}>
        <Routes>
          <Route path="/repo/:owner/:name" element={<RepoPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

test('the page status region persists across the pending-to-resolved transition', async () => {
  server.use(
    http.get(REPO_URL, async () => {
      await delay(20)
      return HttpResponse.json(repoPayload())
    }),
  )

  renderPage()

  const pendingNode = screen.getByTestId('repo-status')
  expect(pendingNode).toHaveTextContent(/loading a\/b/i)

  await screen.findByRole('heading', { name: 'a/b' })

  expect(screen.getByTestId('repo-status')).toBe(pendingNode)
  expect(pendingNode).toHaveTextContent('')
})

test('one load produces one announcement, not a skeleton announcing as well', async () => {
  server.use(
    http.get(REPO_URL, async () => {
      await delay(20)
      return HttpResponse.json(repoPayload())
    }),
  )

  renderPage()

  // The only live region on screen while the page is pending is the page's own.
  expect(screen.getAllByRole('status')).toHaveLength(1)

  await screen.findByRole('heading', { name: 'a/b' })
})

test('a repository with no contributors gets the shared empty state', async () => {
  renderPage()

  expect(await screen.findByText(/no contributors yet/i)).toBeInTheDocument()
})

test('a repository with no commit activity gets the shared empty state', async () => {
  renderPage()

  expect(await screen.findByText(/no commit activity/i)).toBeInTheDocument()
})
