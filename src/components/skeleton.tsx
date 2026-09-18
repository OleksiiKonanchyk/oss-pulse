/**
 * Purely decorative, and deliberately silent.
 *
 * A skeleton exists only while something is pending, so a live region inside it is created
 * when the load starts and destroyed when it ends — precisely the arrangement assistive
 * technology does not reliably announce, and the reason RepoRow, IssuesPanel,
 * ContributorsCard and RepoPage each own a status region that outlives their own pending
 * state. Announcing here as well produced two polite announcements for one load.
 */
export function Skeleton({ rows = 3, className = 'h-8' }: { rows?: number; className?: string }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className={`animate-pulse rounded bg-slate-200 dark:bg-slate-800 ${className}`}
        />
      ))}
    </div>
  )
}
