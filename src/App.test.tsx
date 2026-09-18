import { render, screen } from '@testing-library/react'
import App from './App'

test('renders the application shell', async () => {
  render(<App />)
  expect(await screen.findByRole('link', { name: 'OSS Pulse' })).toBeInTheDocument()
})
