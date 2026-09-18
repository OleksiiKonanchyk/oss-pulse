import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LazyRepoPage } from './lazy-repo-page'

// A promise that never resolves keeps `React.lazy` suspended indefinitely, which is what
// lets this test observe the Suspense fallback itself rather than racing its replacement.
vi.mock('./repo-page', () => new Promise(() => {}))

function renderLazyPage() {
  return render(
    <MemoryRouter initialEntries={['/repo/a/b']}>
      <Routes>
        <Route path="/repo/:owner/:name" element={<LazyRepoPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

test('the Suspense fallback exposes a status region while the chunk is pending', () => {
  renderLazyPage()

  const status = screen.getByRole('status')
  expect(status).toHaveTextContent(/loading/i)
})
