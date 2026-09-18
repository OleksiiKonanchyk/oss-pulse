export type PageLinks = {
  first?: string
  prev?: string
  next?: string
  last?: string
}

const RELATIONS = ['first', 'prev', 'next', 'last'] as const
type Relation = (typeof RELATIONS)[number]

function isRelation(value: string): value is Relation {
  return (RELATIONS as readonly string[]).includes(value)
}

/**
 * Parses GitHub's RFC 5988 `Link` header into the page URLs it names.
 *
 * Only the four pagination relations are kept; GitHub also sends documentation
 * relations on some endpoints, and those are noise for our purposes.
 */
export function parseLinkHeader(header: string | null): PageLinks {
  if (!header) return {}

  const links: PageLinks = {}

  for (const section of header.split(',')) {
    const match = section.match(/<([^>]+)>\s*;\s*rel="([^"]+)"/)
    if (!match) continue

    const [, url, rel] = match
    if (isRelation(rel)) links[rel] = url
  }

  return links
}
