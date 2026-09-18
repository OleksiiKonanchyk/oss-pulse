export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
      <h2 className="text-base font-medium">{title}</h2>
      {description && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{description}</p>
      )}
    </div>
  )
}
