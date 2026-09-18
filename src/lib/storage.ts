/**
 * localStorage throws in private-browsing modes and can hold anything a previous
 * version wrote, so every read is defensive and every failure is non-fatal.
 */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable or full: the app still works for this session.
  }
}
