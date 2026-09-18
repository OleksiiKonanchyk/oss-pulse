# OSS Pulse

A dashboard for tracking open-source repository health — stars, contributors, commit
activity, and issue throughput — pulled live from the GitHub REST API.

**Live URL:** _not deployed yet — add here once live._

## Why it exists

This is a portfolio piece, built to demonstrate how I'd approach a small SaaS-style
front end against a real, rate-limited, occasionally-inconsistent third-party API,
rather than against a mock that always answers cleanly. It tracks a handful of
repositories, shows their vital signs on an overview page, and drills into each one
for contributors, a commit-activity chart, and a filterable, paginated issues table.

## The rate limit is the interesting part

GitHub caps unauthenticated REST requests at **60 per hour** per IP. For a dashboard
that reads several endpoints per repository, that budget disappears fast — so the app
is built around it rather than around the happy path:

- **The query cache is persisted to `localStorage`**, not just kept in memory. A
  reload doesn't cost a fresh round of requests; `staleTime` is set to an hour, on the
  premise that repository metadata doesn't change fast enough to justify spending
  quota re-fetching it (`src/queries/client.ts`).
- **Remaining quota is visible at all times.** Every response carries
  `x-ratelimit-*` headers; the client publishes them through a small subscriber
  (`src/api/rate-limit.ts`), and a badge in the header shows remaining/limit live,
  turning amber under 10 requests left (`src/components/rate-limit-badge.tsx`).
- **Exhaustion gets a designed screen, not a blank one.** A `403`/`429` with
  `x-ratelimit-remaining: 0` is classified as `{ kind: 'rate-limited', resetAt }`
  (`src/api/errors.ts`) and rendered as an explanation with a countdown to reset and
  a link to add a token — not a generic error or an empty panel
  (`src/components/error-state.tsx`).
- **Each overview row costs one sparkline request — up to five while GitHub is still
  computing statistics for that repository** (`getCommitActivity` polls the `202`
  response), gated on that row's repository request having succeeded — a row that
  404'd or hit the limit spends nothing confirming it, and the commit-activity cache
  entry is shared with the detail page.
- **An optional personal access token** raises the ceiling to 5,000 requests/hour.
  It's entered on the Settings page, kept in `localStorage`, sent only to
  `api.github.com`, and needs no scopes for public data (`src/features/settings/settings-page.tsx`,
  `src/lib/token.ts`).

Retries are deliberately **off** for query failures: retrying an exhausted quota only
makes it worse, and there's a real screen for that state instead.

## Architecture: `api/` never renders, `features/` never fetches

The codebase holds a hard line between two layers:

- **`src/api/`** knows HTTP and nothing about React. `client.ts` is the single place
  that calls `fetch`; `github.ts` builds typed resource functions (`getRepo`,
  `getIssues`, `getContributors`, `getCommitActivity`) on top of it; `errors.ts`,
  `rate-limit.ts`, and `link-header.ts` handle classification, quota, and pagination
  as plain functions.
- **`src/features/`** knows React (components, hooks, TanStack Query) and never calls
  `fetch` directly — it calls the functions in `src/api/` through the query hooks in
  `src/queries/use-github-queries.ts`.

The payoff is that the logic worth testing carefully — error classification, Link
header parsing, the commit-activity retry loop, rate-limit publishing — is plain
TypeScript with no rendering involved. It's tested by calling functions and asserting
on return values, not by mounting components and firing events.

## The `202` case

`GET /repos/{owner}/{repo}/stats/commit_activity` doesn't always have an answer ready.
The first time (or shortly after) a repository's statistics are requested, GitHub
returns `202 Accepted` with an empty body while it computes them in the background.

`getCommitActivity` (`src/api/github.ts`) treats this as an expected, transient state
rather than an error: it polls up to 5 times with a 1.5s delay between attempts, and
if the data still isn't ready, returns the literal string `'computing'` instead of
throwing. `CommitActivityChart` renders that as "GitHub is still computing statistics
for this repository. Check back shortly." — a real state, not a caught exception.
Mock servers rarely reproduce this because it costs nothing to always return `200`;
it only shows up against the real API.

## Running it

```bash
npm install
npm run dev     # start the app
npm test        # run the test suite
```

Other scripts: `npm run typecheck`, `npm run build`, `npm run lint`.

## What the throughput chart is, and isn't

The card headed "Issues on this page, by week opened" charts exactly that: the 25 rows
currently on screen, under the filters currently applied, bucketed by the week each one
was opened. It is not a repository-wide time series, and it is not opened-against-closed.
Either would mean walking the issue history a page at a time — one request per page, which
for a busy repository is the entire hourly budget — so the card is labelled with the scope
it actually has rather than implying a total that would silently change as you page.

## Deliberate omissions

- **No backend.** Every request goes straight from the browser to `api.github.com`.
  There's nothing to proxy, cache server-side, or keep alive — and nothing to deploy
  besides static files.
- **No auth.** The optional token is a bring-your-own GitHub personal access token
  used purely to raise the client's own rate limit; there's no login, no session, no
  user account to manage.
- **No state-management library.** Server data lives in TanStack Query, which already
  owns caching, retries, and staleness; the small bits of local state (theme, tracked
  repos, token, issue filters) are plain `localStorage`-backed subscriptions
  (`useSyncExternalStore`) or component state, and URL search params for the issues
  filters. Adding Redux or Zustand on top would duplicate what Query and the URL
  already do.
