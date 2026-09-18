import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useIssuesParams } from './use-issues-params'

function Probe() {
  const { filters, setFilters } = useIssuesParams()

  return (
    <div>
      <output>{JSON.stringify(filters)}</output>
      <button onClick={() => setFilters({ state: 'closed' })}>close</button>
      <button onClick={() => setFilters({ page: 3 })}>page 3</button>
      <button onClick={() => setFilters({ page: 2, state: 'closed' })}>page and state</button>
    </div>
  )
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/r" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  )
}

test('defaults to open issues on page one', () => {
  renderAt('/r')
  expect(screen.getByRole('status')).toHaveTextContent('"state":"open"')
  expect(screen.getByRole('status')).toHaveTextContent('"page":1')
})

test('reads filters out of the query string', () => {
  renderAt('/r?state=closed&labels=bug&creator=ann&page=4')

  const output = screen.getByRole('status')
  expect(output).toHaveTextContent('"state":"closed"')
  expect(output).toHaveTextContent('"labels":"bug"')
  expect(output).toHaveTextContent('"creator":"ann"')
  expect(output).toHaveTextContent('"page":4')
})

test('ignores an invalid state rather than passing it to the API', () => {
  renderAt('/r?state=banana')
  expect(screen.getByRole('status')).toHaveTextContent('"state":"open"')
})

test('changing a filter resets to page one', async () => {
  const user = userEvent.setup()
  renderAt('/r?page=5')

  await user.click(screen.getByRole('button', { name: 'close' }))

  expect(screen.getByRole('status')).toHaveTextContent('"page":1')
  expect(screen.getByRole('status')).toHaveTextContent('"state":"closed"')
})

test('changing the page does not reset the page', async () => {
  const user = userEvent.setup()
  renderAt('/r?state=closed')

  await user.click(screen.getByRole('button', { name: 'page 3' }))

  expect(screen.getByRole('status')).toHaveTextContent('"page":3')
  expect(screen.getByRole('status')).toHaveTextContent('"state":"closed"')
})

// Pins the current behaviour when page and a filter are set in the same call: this is
// not "paging only" (more than one key changed), so it takes the reset-to-page-one branch
// and the caller's requested page is dropped. No call site in the app does this today, but
// nothing else pins it, so a future refactor of setFilters could change it unnoticed.
test('setting the page together with another filter resets to page one anyway', async () => {
  const user = userEvent.setup()
  renderAt('/r?page=5')

  await user.click(screen.getByRole('button', { name: 'page and state' }))

  expect(screen.getByRole('status')).toHaveTextContent('"page":1')
  expect(screen.getByRole('status')).toHaveTextContent('"state":"closed"')
})
