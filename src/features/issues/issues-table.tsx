import type { Issue } from '../../api/types'

/**
 * <caption> text is sr-only (visually the "Issues" Card title above already labels this
 * region) but must not literally repeat that heading's text, or a query for one string
 * matches both nodes and fails confusingly.
 */
export function IssuesTable({ issues }: { issues: Issue[] }) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Issues matching the selected filters</caption>
      <thead>
        <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <th scope="col" className="py-2 pr-4">
            Issue
          </th>
          <th scope="col" className="py-2 pr-4">
            Author
          </th>
          <th scope="col" className="py-2 pr-4">
            Labels
          </th>
          <th scope="col" className="py-2 pr-4">
            Comments
          </th>
          <th scope="col" className="py-2">
            Opened
          </th>
        </tr>
      </thead>
      <tbody>
        {issues.map((issue) => (
          <tr key={issue.number} className="border-b border-slate-100 dark:border-slate-800/60">
            <td className="py-2 pr-4">
              <a
                href={issue.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium underline-offset-4 hover:underline"
              >
                {issue.title}
              </a>
              <span className="ml-1 text-slate-500">#{issue.number}</span>
            </td>
            <td className="py-2 pr-4">{issue.author ?? 'Unknown'}</td>
            <td className="py-2 pr-4">
              {issue.labels.length === 0 ? (
                <span className="text-slate-400">None</span>
              ) : (
                <ul className="flex flex-wrap gap-1">
                  {issue.labels.map((label) => (
                    <li
                      key={label.name}
                      className="rounded-full px-2 py-0.5 text-xs text-slate-900 dark:text-slate-50"
                      style={{ backgroundColor: `#${label.color}` }}
                    >
                      {label.name}
                    </li>
                  ))}
                </ul>
              )}
            </td>
            <td className="py-2 pr-4 tabular-nums">{issue.comments}</td>
            <td className="py-2 tabular-nums">{issue.createdAt.toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
