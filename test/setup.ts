import '@testing-library/jest-dom/vitest'
import { afterEach, beforeAll, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './msw/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())

afterEach(() => {
  cleanup()
  localStorage.clear()
  server.resetHandlers()
})
