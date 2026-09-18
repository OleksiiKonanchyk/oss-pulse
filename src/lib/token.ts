import { useSyncExternalStore } from 'react'
import { readJson, writeJson } from './storage'

const KEY = 'oss-pulse:token'

type Listener = () => void
const listeners = new Set<Listener>()

export function getToken(): string | null {
  const stored = readJson<unknown>(KEY, null)
  return typeof stored === 'string' && stored.length > 0 ? stored : null
}

export function setToken(value: string | null): void {
  writeJson(KEY, value)
  for (const listener of listeners) listener()
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useToken(): string | null {
  return useSyncExternalStore(subscribe, getToken)
}
