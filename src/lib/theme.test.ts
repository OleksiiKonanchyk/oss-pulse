import { afterEach, vi } from 'vitest'
import { applyTheme, getTheme, setTheme, watchSystemTheme } from './theme'

type ChangeListener = (event: { matches: boolean }) => void

/**
 * jsdom's `matchMedia` never changes, so the OS switching colour scheme has to be
 * simulated. The stub tracks its listeners, which is also what proves the unsubscribe.
 */
function stubMatchMedia(initialMatches: boolean) {
  const listeners = new Set<ChangeListener>()
  const query = {
    matches: initialMatches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_type: string, listener: ChangeListener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: ChangeListener) => listeners.delete(listener),
  }

  vi.stubGlobal('matchMedia', () => query)

  return {
    emit(matches: boolean) {
      query.matches = matches
      for (const listener of listeners) listener({ matches })
    },
    listenerCount: () => listeners.size,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.documentElement.classList.remove('dark')
})

test('the system theme follows the OS changing colour scheme after boot', () => {
  const media = stubMatchMedia(false)
  setTheme('system')
  const stop = watchSystemTheme()

  expect(document.documentElement).not.toHaveClass('dark')

  media.emit(true)
  expect(document.documentElement).toHaveClass('dark')

  media.emit(false)
  expect(document.documentElement).not.toHaveClass('dark')

  stop()
})

test('an explicit theme choice ignores the OS', () => {
  const media = stubMatchMedia(false)
  setTheme('light')
  const stop = watchSystemTheme()

  media.emit(true)

  expect(getTheme()).toBe('light')
  expect(document.documentElement).not.toHaveClass('dark')

  stop()
})

test('the watcher can be stopped', () => {
  const media = stubMatchMedia(false)
  setTheme('system')

  const stop = watchSystemTheme()
  expect(media.listenerCount()).toBe(1)

  stop()
  expect(media.listenerCount()).toBe(0)

  media.emit(true)
  expect(document.documentElement).not.toHaveClass('dark')
})

test('applyTheme still honours the OS preference at boot', () => {
  stubMatchMedia(true)

  applyTheme('system')
  expect(document.documentElement).toHaveClass('dark')

  applyTheme('light')
  expect(document.documentElement).not.toHaveClass('dark')
})
