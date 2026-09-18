import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isApiError } from '../../api/errors'
import { verifyRepoExists } from '../../queries/use-github-queries'
import { useTrackedRepos } from './use-tracked-repos'

const OWNER_NAME = /^([\w.-]+)\/([\w.-]+)$/
const URL_LIKE = /^https?:\/\//i
const GITHUB_HOSTNAMES = new Set(['github.com', 'www.github.com'])

/** A pasted clone URL's final segment carries a `.git` suffix that isn't part of the repo name. */
function stripGitSuffix(name: string): string {
  return name.replace(/\.git$/i, '')
}

/** Accepts `owner/name` or any github.com URL pointing at a repository. */
export function parseRepoInput(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) return null

  if (URL_LIKE.test(trimmed)) {
    try {
      const url = new URL(trimmed)
      if (!GITHUB_HOSTNAMES.has(url.hostname.toLowerCase())) return null

      const [owner, rawName] = url.pathname.split('/').filter(Boolean)
      if (!owner || !rawName) return null

      const name = stripGitSuffix(rawName)
      if (!name) return null

      return `${owner}/${name}`
    } catch {
      return null
    }
  }

  const match = OWNER_NAME.exec(trimmed)
  if (!match) return null

  const [, owner, rawName] = match
  const name = stripGitSuffix(rawName)
  if (!name) return null

  return `${owner}/${name}`
}

const schema = z.object({
  input: z.string().refine((value) => parseRepoInput(value) !== null, {
    message: 'Use owner/name, or paste a GitHub repository URL.',
  }),
})

type FormValues = z.infer<typeof schema>

export function AddRepoForm() {
  const { repos, track, untrack } = useTrackedRepos()
  const [serverError, setServerError] = useState<string | null>(null)
  // Guards against a second submission (e.g. Enter fired while a click-triggered
  // submit is still pending) racing the first and clobbering its error message.
  const submittingRef = useRef(false)

  const { register, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { input: '' },
  })

  async function onSubmit({ input }: FormValues) {
    if (submittingRef.current) return
    submittingRef.current = true

    try {
      const fullName = parseRepoInput(input)
      if (!fullName) return

      setServerError(null)

      // A repo already on the list must not be removed just because this
      // redundant verification attempt fails; only roll back what we added.
      const wasAlreadyTracked = repos.some(
        (name) => name.toLowerCase() === fullName.toLowerCase(),
      )

      // Optimistic: the row appears immediately and rolls back if GitHub disagrees.
      track(fullName)
      reset()

      try {
        await verifyRepoExists(fullName)
      } catch (error) {
        if (!wasAlreadyTracked) untrack(fullName)
        setServerError(
          isApiError(error) && error.error.kind === 'not-found'
            ? `${fullName} could not be found on GitHub.`
            : `${fullName} could not be verified. Try again.`,
        )
      }
    } finally {
      submittingRef.current = false
    }
  }

  const message = formState.errors.input?.message ?? serverError

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm">
      <label htmlFor="add-repo" className="block text-sm font-medium">
        Add a repository
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id="add-repo"
          {...register('input')}
          placeholder="owner/name"
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? 'add-repo-error' : undefined}
          className="flex-1 rounded border border-slate-300 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900"
        />
        <button
          type="submit"
          disabled={formState.isSubmitting}
          className="rounded bg-slate-900 px-4 py-1.5 font-medium text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
        >
          Add
        </button>
      </div>
      {message && (
        <p id="add-repo-error" role="alert" className="mt-1 text-sm text-amber-700 dark:text-amber-400">
          {message}
        </p>
      )}
    </form>
  )
}
