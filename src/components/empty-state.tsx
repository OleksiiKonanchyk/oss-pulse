import type { ReactNode } from 'react'

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
      <h2 className="text-base font-medium">{title}</h2>
      {description && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
