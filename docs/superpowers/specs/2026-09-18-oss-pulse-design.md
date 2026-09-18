# OSS Pulse — design

**Date:** 2026-09-18
**Status:** awaiting review

## Purpose

A portfolio piece for Oleksii Konanchyk, aimed at Upwork clients hiring
React/TypeScript front-end work on SaaS products.

It has to survive a thirty-second skim by someone who is not going to read
the code. That means a client should look at it and think *"that resembles
the thing I need built."* Every decision below serves that, and the second
goal behind it: nothing in the repo should be explicable as a tutorial
followed to the end.

**Success criteria**

- Deployed, public URL, loads in under two seconds on a cold visit
- Demonstrates the UI patterns SaaS job posts actually list: server-side
  pagination, filtering, search, charts, drill-down, validated forms,
  optimistic updates
- Handles a real API's real failure modes visibly — not a mock server that
  always says 200
- Readable in one sitting by a reviewing developer

**Non-goals**

- Not a product with users. No auth, no backend, no database.
- No write operations against GitHub.
- Not a showcase of every library in the ecosystem.

## What it is

A dashboard for tracking the health of a set of open-source repositories:
activity, issue throughput, contributors. The user picks repositories to
track; the app shows how each is doing.

The domain is chosen so the app looks like a B2B tool a company pays for —
the same shape as Swarmia or LinearB — while running entirely on a public
API with no key required.

## Stack

| Concern | Choice | Reason |
|---|---|---|
| Build | Vite | Fast, and what most current job posts assume |
| Language | TypeScript, strict | Non-negotiable for the audience |
| Server state | TanStack Query | Caching is load-bearing here (see rate limits) |
| Routing | React Router v6 | Most common in job posts |
| Forms | react-hook-form + zod | Named together in job posts constantly |
| Styling | Tailwind | Ditto |
| Charts | Recharts | Adequate, small, declarative |
| Tests | Vitest + React Testing Library + MSW | Matches the Vite toolchain |
| Deploy | Vercel | Static SPA |

Client-side only. No server, so no secrets, and the whole thing deploys as
static files.

**Deliberately not included:** no state-management library. Server state
lives in TanStack Query and the only client state is the tracked-repo list,
which is a `localStorage`-backed hook. Adding Redux or Zustand for one array
would be noise in a repo meant to be read.

## The central constraint: rate limits

GitHub's REST API allows **60 requests per hour unauthenticated**, 5,000
with a token. For a public demo with no backend, this is the defining
constraint, and designing around it honestly is more impressive than hiding
from it.

**Approach**

1. **Cache aggressively.** TanStack Query with a long `staleTime`, persisted
   to `localStorage`, so a reload or a revisit costs nothing. Repository
   metadata changes slowly; treating it as fresh for an hour is correct, not
   a workaround.
2. **Show the budget.** Every response carries `x-ratelimit-remaining` and
   `x-ratelimit-reset`. The client reads them and a header indicator shows
   remaining quota. Making the constraint visible is part of the demo.
3. **Treat exhaustion as a designed state.** A `403` with
   `x-ratelimit-remaining: 0` renders a real screen — what happened, when it
   resets, counting down, and how to lift it — not a toast saying
   "Something went wrong".
4. **Optional token.** A field in settings, stored in `localStorage`, sent
   only to `api.github.com`. Clearly labelled as to what it does and where
   it goes. Never required.

A visitor with no token gets a working app because of the cache; a visitor
who adds one gets the whole thing.

## Screens

### Overview

The tracked repositories as a table: name, stars, open issues, last push,
and a sparkline of recent commit activity. Sortable by column. Empty state
on first visit seeds three well-known repositories so the app is never blank
on arrival.

Adding a repository is a form taking `owner/name` or a full GitHub URL,
validated with zod, which checks the repository exists before accepting it.
Adding and removing update the list optimistically and roll back on failure.

### Repository detail

- **Header** — stars, forks, watchers, language, license, last push
- **Commit activity** — 52 weeks, from `/stats/commit_activity`
- **Issue throughput** — issues opened, by week. **Amended during build:** only the
  opened series ships, and it charts the page of issues currently on screen (25 rows,
  as filtered) rather than a repository-wide series. A repository-wide count would cost
  a request per page of issue history, which the 60-per-hour budget cannot spend; the
  card is labelled with that scope rather than implying a total.
- **Contributors** — top ten by commits
- **Issues** — paginated, filterable table (below)

### Issues table

The most load-bearing component, because it is the pattern most SaaS job
posts describe.

- Server-side pagination via the `Link` header — not fetch-everything-and-
  slice
- Filters: state, labels, author
- Debounced text search
- Sortable columns
- **Filter and page state live in the URL** as search params, so a filtered
  view is shareable and browser back/forward behaves. Clients notice this
  even when they can't name it.

### Settings

Token field, theme toggle, cache controls (clear cached data).

## Architecture

```
src/
  api/          GitHub client: fetch wrapper, Link header parsing,
                rate-limit header extraction, error normalisation
  queries/      TanStack Query hooks, one module per resource
  features/
    repos/      overview, add-repo form, tracked-repo storage
    repo/       detail screen, charts, contributors
    issues/     table, filters, URL state sync
    settings/
  components/   Table, Card, Button, Skeleton, EmptyState, ErrorState
  lib/          formatting, storage, hooks
```

The boundary that matters: **`api/` knows about HTTP and nothing about
React; `features/` knows about React and never calls `fetch`.** Everything
between them is a typed query hook. That keeps the interesting logic — Link
header parsing, error classification, the `202` retry — testable as plain
functions, with no component rendering involved.

### Error handling

Errors are normalised into a discriminated union at the API boundary:

```ts
type ApiError =
  | { kind: 'rate-limited'; resetAt: Date }
  | { kind: 'not-found' }
  | { kind: 'network' }
  | { kind: 'unknown'; status: number; message: string }
```

Components switch on `kind` and render a matching state. Nothing renders a
raw error string. Each route has an error boundary so a failure in one panel
doesn't blank the screen.

### The `202` case

`/stats/commit_activity` returns `202` with an empty body while GitHub
computes statistics, and the client is expected to retry. Most portfolios
never encounter this because mock servers always return `200`. Handling it —
retry with backoff, a "computing statistics" state, a ceiling on attempts —
is a genuine signal of having worked against real APIs, and it costs about
thirty lines.

## Testing

Vitest, React Testing Library, MSW for API mocking.

Tested because breakage would be embarrassing and silent:

- Link header parsing, including the single-page and absent-header cases
- Error classification, especially rate-limited against ordinary `403`
- The `202` retry, including the attempt ceiling
- Filter state ↔ URL round-trip
- Issues table: renders rows, empty state, error state, loading skeleton

Not chasing a coverage number. The test suite is itself a portfolio artifact
— a reviewer reading `api/` tests should see judgment about what is worth
testing, not exhaustiveness.

## Accessibility

Keyboard-navigable throughout; visible focus rings; correct table semantics;
`aria-live` for async state changes; dark mode via `prefers-color-scheme`
with a manual override. Charts carry text alternatives — a chart that only
exists visually is a gap a reviewing developer will notice.

## Risks

| Risk | Mitigation |
|---|---|
| Rate limits make the live demo look broken | Persisted cache plus seeded default repos; the demo works with zero requests on a warm cache |
| Scope creep into a real product | Non-goals above are binding. No auth, no backend, no writes. |
| Reads as generic | The rate-limit handling, URL-as-state, and `202` retry are the differentiators; they get built, not cut |
| Charts eat the schedule | Two Recharts chart types only — a bar chart (commit activity) and a line chart (issue throughput). **Amended during build:** the overview sparkline is a hand-written inline SVG rather than the bar chart reused at small size, so that Recharts stays out of the landing page's bundle and behind the lazily-loaded repository route |

## Out of scope for v1

Comparison between repositories, org-wide rollups, notifications, data
export, real-time updates, mobile-specific layouts beyond responsive.

## Open questions

1. **Project name.** `oss-pulse` is a placeholder.
2. **Repository visibility.** Public is assumed — a portfolio piece a client
   cannot read is not a portfolio piece.
3. **Seeded repositories.** Suggest `facebook/react`, `vercel/next.js`,
   `rails/rails` — recognisable, high-activity, and the last one quietly
   signals the Rails background.
