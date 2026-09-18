import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isApiError } from '../../api/errors'
import { verifyRepoExists } from '../../queries/use-github-queries'
import { useTrackedRepos } from './use-tracked-repos'

const OWNER_NAME = /^([\w.-]+)\/([\w.-]+)$/

/** Accepts `owner/name` or any github.com URL pointing at a repository. */
export function parseRepoInput(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) return null

  if (trimmed.startsWith('http')) {
    try {
      const url = new URL(trimmed)
      if (url.hostname !== 'github.com') return null

      const [owner, name] = url.pathname.split('/').filter(Boolean)
      if (!owner || !name) return null

      return `${owner}/${name}`
    } catch {
      return null
    }
  }

  return OWNER_NAME.test(trimmed) ? trimmed : null
}

const schema = z.object({
  input: z.string().refine((value) => parseRepoInput(value) !== null, {
    message: 'Use owner/name, or paste a GitHub repository URL.',
  }),
})

type FormValues = z.infer<typeof schema>

export function AddRepoForm() {
  const { track, untrack } = useTrackedRepos()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { input: '' },
  })

  async function onSubmit({ input }: FormValues) {
    const fullName = parseRepoInput(input)
    if (!fullName) return

    setServerError(null)

    // Optimistic: the row appears immediately and rolls back if GitHub disagrees.
    track(fullName)
    reset()

    try {
      await verifyRepoExists(fullName)
    } catch (error) {
      untrack(fullName)
      setServerError(
        isApiError(error) && error.error.kind === 'not-found'
          ? `${fullName} could not be found on GitHub.`
          : `${fullName} could not be verified. Try again.`,
      )
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
