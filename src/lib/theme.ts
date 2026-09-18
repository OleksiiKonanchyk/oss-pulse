import { useSyncExternalStore } from 'react'
import { readJson, writeJson } from './storage'

const KEY = 'oss-pulse:theme'
export type Theme = 'light' | 'dark' | 'system'

type Listener = () => void
const listeners = new Set<Listener>()

export function getTheme(): Theme {
  const stored = readJson<unknown>(KEY, 'system')
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

export function setTheme(theme: Theme): void {
  writeJson(KEY, theme)
  applyTheme(theme)
  for (const listener of listeners) listener()
}

export function applyTheme(theme: Theme): void {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = theme === 'dark' || (theme === 'system' && prefersDark)

  document.documentElement.classList.toggle('dark', dark)
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme)
}
