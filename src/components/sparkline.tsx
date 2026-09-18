import type { CommitWeek } from '../api/types'

const VIEWBOX_WIDTH = 100
const VIEWBOX_HEIGHT = 24

/**
 * A deliberately dependency-free chart.
 *
 * The detail page's Recharts bar chart is the heaviest thing in the bundle, and the
 * overview is the page a cold visitor lands on. Reusing that chart at small size — the
 * original plan — would pull Recharts into the entry chunk to draw a dozen rectangles in
 * a table cell, and undo the code-splitting that keeps the first paint cheap. Twelve
 * `<rect>`s cost nothing and ship no library.
 */
export function Sparkline({ weeks, label }: { weeks: CommitWeek[]; label: string }) {
  if (weeks.length === 0) return null

  // A flat run of zeroes would divide by zero; a floor of 1 keeps it a flat baseline.
  const max = Math.max(...weeks.map((week) => week.total), 1)
  const columnWidth = VIEWBOX_WIDTH / weeks.length

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      preserveAspectRatio="none"
      focusable="false"
      className="h-6 w-24 text-sky-600 dark:text-sky-400"
    >
      {weeks.map((week, index) => {
        // Every week gets at least a sliver, so a quiet week reads as "almost none"
        // rather than as missing data.
        const height = Math.max(1, (week.total / max) * VIEWBOX_HEIGHT)

        return (
          <rect
            key={week.weekStart.toISOString()}
            x={index * columnWidth}
            y={VIEWBOX_HEIGHT - height}
            width={columnWidth * 0.7}
            height={height}
            fill="currentColor"
          />
        )
      })}
    </svg>
  )
}
