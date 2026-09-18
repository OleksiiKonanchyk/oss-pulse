export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="h-8 animate-pulse rounded bg-slate-200 dark:bg-slate-800"
        />
      ))}
    </div>
  )
}
