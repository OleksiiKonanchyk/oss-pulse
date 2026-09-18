import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { getToken } from '../../lib/token'
import { SettingsPage } from './settings-page'

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  )
}

test('saves a token', async () => {
  const user = userEvent.setup()
  renderPage()

  await user.type(screen.getByLabelText(/personal access token/i), 'ghp_example')
  await user.click(screen.getByRole('button', { name: /save token/i }))

  expect(getToken()).toBe('ghp_example')
})

test('clears a saved token', async () => {
  const user = userEvent.setup()
  renderPage()

  await user.type(screen.getByLabelText(/personal access token/i), 'ghp_example')
  await user.click(screen.getByRole('button', { name: /save token/i }))
  await user.click(screen.getByRole('button', { name: /clear token/i }))

  expect(getToken()).toBeNull()
})

test('masks the token field', () => {
  renderPage()
  expect(screen.getByLabelText(/personal access token/i)).toHaveAttribute('type', 'password')
})

test('states where the token is stored and where it is sent', () => {
  renderPage()

  expect(screen.getByText(/stays in your browser/i)).toBeInTheDocument()
  expect(screen.getByText(/api\.github\.com/i)).toBeInTheDocument()
})

test('clearing cached data says so, from a region that was there beforehand', async () => {
  const user = userEvent.setup()
  renderPage()

  const status = screen.getByTestId('cache-status')
  expect(status).toHaveAttribute('role', 'status')
  expect(status).toHaveTextContent('')

  await user.click(screen.getByRole('button', { name: /clear cached data/i }))

  expect(screen.getByTestId('cache-status')).toBe(status)
  expect(status).toHaveTextContent(/cached data cleared/i)
})
