import { createContext, Fragment, useContext, useMemo } from 'react'

import { cn } from '@/lib/utils'

// Context-based query propagation. Wrap any subtree in
// <HighlightProvider query={…}> and every <Highlight> inside (or anywhere
// it's used as a building block) inherits that query without prop-drilling.
// The explicit `query` prop on <Highlight> still wins when set, so callers
// can override per-instance.
const HighlightContext = createContext('')

function HighlightProvider({ query, children }) {
  return <HighlightContext.Provider value={query ?? ''}>{children}</HighlightContext.Provider>
}

// Regex metacharacters that must be escaped when a user-typed token is
// embedded into a RegExp source. Without this, a query like "C++" or "(a)"
// would either throw or match the wrong thing.
function escapeRegExp(source) {
  return source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Mirrors PostgreSQL pg_trgm's trigram model: lowercase, pad the string with
// two leading and one trailing space, then take every 3-character window
// into a Set. We're using this only for *visual* highlight selection, not
// for ranking, so exact parity with the server is not required — but it's
// close enough that words the backend matched fuzzily also get highlighted
// here.
function trigramSet(source) {
  const padded = `  ${source.toLowerCase()} `
  const set = new Set()
  for (let i = 0; i <= padded.length - 3; i += 1) {
    set.add(padded.slice(i, i + 3))
  }
  return set
}

function jaccardSimilarity(aSet, bSet) {
  if (aSet.size === 0 || bSet.size === 0) return 0
  let intersection = 0
  for (const t of aSet) if (bSet.has(t)) intersection += 1
  return intersection / (aSet.size + bSet.size - intersection)
}

// Threshold for fuzzy word highlighting. pg_trgm defaults to 0.3 for the
// `%` operator; we match that so what the server matched is what the user
// sees lit up. Tighter (0.4+) misses real matches; looser (<0.25) flags
// noise letters and looks worse than no highlight.
const FUZZY_SIMILARITY_THRESHOLD = 0.3

// Below this query length the trigram model isn't meaningful (a 1- or 2-
// char query has only 1–2 trigrams and matches half the dictionary). For
// short queries we rely entirely on exact-substring matching, which the
// server's leg-1 prefix-LIKE and leg-2 substring-LIKE will have produced
// anyway.
const FUZZY_MIN_QUERY_LENGTH = 4

/**
 * Wraps occurrences of a search query inside `text` with a styled <mark>.
 *
 * Two-stage match strategy mirrors the v2 backend's hybrid retrieval:
 *
 *   1. Exact substring (case-insensitive, Unicode-aware): every occurrence
 *      of any whitespace-separated token from `query` is highlighted. This
 *      covers the backend's prefix-LIKE and substring-LIKE legs.
 *
 *   2. Fuzzy fallback (only when stage 1 found nothing): tokens of
 *      length ≥ 4 are compared word-by-word against `text` using a JS port
 *      of pg_trgm's trigram-Jaccard similarity. Words scoring ≥ 0.30 are
 *      highlighted. This is what makes "Mohamad" light up "Mohammad" and
 *      "muzic" light up "Music" — i.e. the rows the backend matched on
 *      its trigram-similarity leg now visibly explain themselves.
 *
 * Returns `text` unchanged when the query is empty, the field is null, or
 * neither stage produced a match — safe to drop into any cell without
 * conditional logic at the call site.
 */
function Highlight({ text, query, className }) {
  const inheritedQuery = useContext(HighlightContext)
  const effectiveQuery = query ?? inheritedQuery
  const result = useMemo(() => {
    if (typeof text !== 'string' || text.length === 0) return null
    // Tokenize on whitespace, matching the backend MediaSearchSqlBuilder.
    // Then drop tokens that contain no letters or digits in any script
    // (Unicode-aware via \p{L}/\p{N}). Pure-punctuation tokens — em-dash,
    // hyphen, slash — are noise to highlight: a query like "دیوانی نالی —
    // Track 1" should light up the four meaningful tokens, not every "—"
    // in every other row's title. The backend may still use those tokens
    // for AND-matching; the highlight is purely presentational.
    const tokens = (effectiveQuery || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .filter((t) => /[\p{L}\p{N}]/u.test(t))
    if (tokens.length === 0) return null

    // ── Stage 1: exact substring (case-insensitive, Unicode) ──────────
    const escaped = tokens.map(escapeRegExp)
    const exactRe = new RegExp(`(${escaped.join('|')})`, 'giu')
    const exactParts = text.split(exactRe)
    const hasExact = exactParts.some((part, idx) => idx % 2 === 1 && part)
    if (hasExact) {
      return { kind: 'exact', parts: exactParts }
    }

    // ── Stage 2: fuzzy word-level fallback ────────────────────────────
    const fuzzyTokens = tokens.filter((t) => t.length >= FUZZY_MIN_QUERY_LENGTH)
    if (fuzzyTokens.length === 0) return null
    const tokenTrigramSets = fuzzyTokens.map((t) => trigramSet(t))

    // Split on a captured \S+ so we get an alternating array
    // [edge, word, gap, word, gap, …, edge] — odd indices are words.
    const wordParts = text.split(/(\S+)/u)
    let fuzzyHit = false
    const annotated = wordParts.map((part, idx) => {
      if (idx % 2 === 0 || !part) return { match: false, text: part }
      const wordSet = trigramSet(part)
      const matched = tokenTrigramSets.some(
        (qSet) => jaccardSimilarity(wordSet, qSet) >= FUZZY_SIMILARITY_THRESHOLD,
      )
      if (matched) fuzzyHit = true
      return { match: matched, text: part }
    })
    if (!fuzzyHit) return null
    return { kind: 'fuzzy', parts: annotated }
  }, [text, effectiveQuery])

  if (result == null) return text ?? null

  if (result.kind === 'exact') {
    return (
      <>
        {result.parts.map((part, idx) =>
          // String.split with a capturing group alternates: [before, match,
          // between, match, …]. Odd indices are guaranteed to be a match.
          idx % 2 === 1 && part ? (
            <mark
              key={idx}
              className={cn(
                'rounded-[3px] bg-yellow-200/80 px-0.5 font-semibold text-foreground shadow-[inset_0_-1px_0_var(--color-yellow-400)] dark:bg-yellow-500/35 dark:shadow-[inset_0_-1px_0_var(--color-yellow-300)]',
                className,
              )}
            >
              {part}
            </mark>
          ) : (
            // Wrap plain segments in a keyed fragment so React doesn't
            // complain about missing keys on string children of a list —
            // some renderers (React 19+) tighten this.
            <Fragment key={idx}>{part}</Fragment>
          ),
        )}
      </>
    )
  }

  // Fuzzy: highlight whole matched words with a slightly softer style and
  // a dotted underline so the user can tell "this word approximately
  // matched your query, not exactly".
  return (
    <>
      {result.parts.map((segment, idx) =>
        segment.match ? (
          <mark
            key={idx}
            className={cn(
              'rounded-[3px] bg-amber-200/60 px-0.5 font-medium text-foreground underline decoration-dotted decoration-amber-700/70 underline-offset-2 dark:bg-amber-500/25 dark:decoration-amber-300/70',
              className,
            )}
          >
            {segment.text}
          </mark>
        ) : (
          <Fragment key={idx}>{segment.text}</Fragment>
        ),
      )}
    </>
  )
}

export { Highlight, HighlightProvider }
