import { setTheme, useTheme, type Theme } from '../lib/theme'

const OPTIONS: Theme[] = ['light', 'dark', 'system']

export function ThemeToggle() {
  const theme = useTheme()

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">Colour theme</span>
      <select
        value={theme}
        onChange={(event) => setTheme(event.target.value as Theme)}
        className="rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
      >
        {OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}
