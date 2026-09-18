import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '../../../test/msw/server'
import { AddRepoForm, parseRepoInput } from './add-repo-form'
import { getTrackedRepos } from './tracked-repos'

function renderForm() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AddRepoForm />
    </QueryClientProvider>,
  )
}

test('accepts owner/name and full GitHub URLs', () => {
  expect(parseRepoInput('tanstack/query')).toBe('tanstack/query')
  expect(parseRepoInput('https://github.com/tanstack/query')).toBe('tanstack/query')
  expect(parseRepoInput('https://github.com/tanstack/query/issues')).toBe('tanstack/query')
  expect(parseRepoInput('  tanstack/query  ')).toBe('tanstack/query')
})

test('rejects input that is not a repository reference', () => {
  expect(parseRepoInput('tanstack')).toBeNull()
  expect(parseRepoInput('')).toBeNull()
  expect(parseRepoInput('https://example.com/a/b')).toBeNull()
})

test('strips a .git suffix from clone URLs and plain owner/name references', () => {
  expect(parseRepoInput('https://github.com/tanstack/query.git')).toBe('tanstack/query')
  expect(parseRepoInput('tanstack/query.git')).toBe('tanstack/query')
})

test('accepts www.github.com and uppercase schemes', () => {
  expect(parseRepoInput('https://www.github.com/tanstack/query')).toBe('tanstack/query')
  expect(parseRepoInput('HTTPS://github.com/tanstack/query')).toBe('tanstack/query')
})

test('shows a validation message without calling the API', async () => {
  const user = userEvent.setup()
  renderForm()

  await user.type(screen.getByLabelText(/add a repository/i), 'nonsense')
  await user.click(screen.getByRole('button', { name: /add/i }))

  expect(await screen.findByText(/owner\/name/i)).toBeInTheDocument()
})

test('tracks a repository that exists', async () => {
  server.use(
    http.get('https://api.github.com/repos/tanstack/query', () =>
      HttpResponse.json({
        full_name: 'tanstack/query', description: null, stargazers_count: 1,
        forks_count: 0, open_issues_count: 0, language: null,
        pushed_at: '2026-09-01T00:00:00Z', html_url: 'x', license: null,
      }),
    ),
  )

  const user = userEvent.setup()
  renderForm()

  await user.type(screen.getByLabelText(/add a repository/i), 'tanstack/query')
  await user.click(screen.getByRole('button', { name: /add/i }))

  await waitFor(() => expect(getTrackedRepos()).toContain('tanstack/query'))
})

test('does not track a repository that does not exist, and says so', async () => {
  server.use(
    http.get('https://api.github.com/repos/ghost/missing', () =>
      HttpResponse.json({ message: 'Not Found' }, { status: 404 }),
    ),
  )

  const user = userEvent.setup()
  renderForm()

  await user.type(screen.getByLabelText(/add a repository/i), 'ghost/missing')
  await user.click(screen.getByRole('button', { name: /add/i }))

  expect(await screen.findByText(/could not be found/i)).toBeInTheDocument()
  expect(getTrackedRepos()).not.toContain('ghost/missing')
})

test('rolls back a newly added repository when verification fails', async () => {
  server.use(
    http.get('https://api.github.com/repos/new/repo', () =>
      HttpResponse.json({ message: 'Server Error' }, { status: 500 }),
    ),
  )

  expect(getTrackedRepos()).not.toContain('new/repo')

  const user = userEvent.setup()
  renderForm()

  await user.type(screen.getByLabelText(/add a repository/i), 'new/repo')
  await user.click(screen.getByRole('button', { name: /add/i }))

  expect(await screen.findByText(/could not be verified/i)).toBeInTheDocument()
  expect(getTrackedRepos()).not.toContain('new/repo')
})

test('does not remove an already-tracked repository when re-adding it fails verification', async () => {
  server.use(
    http.get('https://api.github.com/repos/facebook/react', () =>
      HttpResponse.json({ message: 'Server Error' }, { status: 500 }),
    ),
  )

  // Seeded by the default tracked list — already present before this submission.
  expect(getTrackedRepos()).toContain('facebook/react')

  const user = userEvent.setup()
  renderForm()

  await user.type(screen.getByLabelText(/add a repository/i), 'facebook/react')
  await user.click(screen.getByRole('button', { name: /add/i }))

  expect(await screen.findByText(/could not be verified/i)).toBeInTheDocument()
  expect(getTrackedRepos()).toContain('facebook/react')
})
