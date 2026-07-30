import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Combine,
  Hash,
  Layers,
  Pencil,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react'

import { AdminEntityPage } from '@/components/admin/AdminEntityPage'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Highlight } from '@/components/ui/highlight'
import { Input } from '@/components/ui/input'
import { DataPagination } from '@/components/ui/pagination'
import { SearchClearButton } from '@/components/ui/search-clear-button'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TypedConfirmDialog } from '@/components/ui/typed-confirm-dialog'
import { usePersistentState } from '@/hooks/use-persistent-state'
import { useToast } from '@/hooks/use-toast'
import { collapseVocabularyText } from '@/lib/canonicalize-tag'
import { getErrorMessage } from '@/lib/get-error-message'
import { cn } from '@/lib/utils'
import { buildSimilarGroups } from '@/lib/vocabulary-similarity'
import { formatNumber } from '@/pages/admin/analytics-constants'
import {
  SimilarGroupCard,
  UsageMeter,
  VocabFilterChip,
  VocabStatCard,
  VocabularyMergeDialog,
  VocabularyRenameDialog,
} from '@/pages/admin/vocabulary-shared'
import {
  VOCABULARY_KINDS,
  deleteVocabularyValue,
  fetchWholeVocabulary,
  renameVocabularyValue,
  vocabularyMeta,
} from '@/services/vocabulary'

// Admin control room for the two shared vocabularies. The backend exposes the
// whole list (value + live usage count) plus a global rename and a global
// delete; everything else here — search, sorting, the one-use view, look-alike
// grouping, bulk merge — is this page turning those three calls into an
// actual editing workflow.
//
// Why the whole vocabulary is loaded at once: the interesting questions
// ("which values are used once?", "which two spellings are the same word?",
// "how many distinct values are there?") are answers about the entire set, and
// an offset window cannot produce them. See services/vocabulary.js.

const PAGE_SIZE = 25

const SORT_OPTIONS = [
  { value: 'uses-desc', label: 'Most used' },
  { value: 'uses-asc', label: 'Least used' },
  { value: 'az', label: 'A → Z' },
  { value: 'za', label: 'Z → A' },
]

const KIND_ICONS = { tag: Tag, keyword: Hash }

function AdminVocabularyPage() {
  const toast = useToast()

  const [kind, setKind] = usePersistentState('admin.vocab.kind', 'tag')
  const [search, setSearch] = usePersistentState('admin.vocab.search', '')
  const [view, setView] = usePersistentState('admin.vocab.view', 'all') // all | once | similar
  const [sort, setSort] = usePersistentState('admin.vocab.sort', 'uses-desc')
  // Look-alike groups the admin has waved off, keyed by kind so tags and
  // keywords keep separate dismissals.
  const [ignoredByKind, setIgnoredByKind] = usePersistentState('admin.vocab.ignored', {})

  const [page, setPage] = useState(0)
  const [rows, setRows] = useState(null)
  const [truncated, setTruncated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [selected, setSelected] = useState(() => new Set())

  const [renameTarget, setRenameTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [mergeValues, setMergeValues] = useState(null) // array of items, or null
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [busy, setBusy] = useState('') // '' | 'rename' | 'merge' | 'delete'
  const [progress, setProgress] = useState(null) // { done, total }
  const [busyGroupKey, setBusyGroupKey] = useState('')

  const meta = vocabularyMeta(kind)

  // Guards against a slow response for tags landing after the admin already
  // switched to keywords.
  const requestRef = useRef(0)

  const load = useCallback(
    async (nextKind = kind) => {
      const token = ++requestRef.current
      setIsLoading(true)
      setError('')
      try {
        const { items, truncated: wasTruncated } = await fetchWholeVocabulary(nextKind)
        if (token !== requestRef.current) return
        setRows(items)
        setTruncated(wasTruncated)
      } catch (err) {
        if (token !== requestRef.current) return
        setRows(null)
        setError(getErrorMessage(err, 'Could not load the vocabulary.'))
      } finally {
        if (token === requestRef.current) setIsLoading(false)
      }
    },
    [kind],
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRows(null)
    setSelected(new Set())
    setPage(0)
    load(kind)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  // Any change to what is on screen sends the reader back to the first page —
  // page 7 of a 3-page result is a dead end.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(0)
  }, [search, view, sort])

  // ── Derived views ──────────────────────────────────────────────────────────

  const usageByValue = useMemo(() => {
    const map = new Map()
    for (const row of rows || []) map.set(row.value, row.usageCount)
    return map
  }, [rows])

  const ignored = useMemo(
    () => new Set(Array.isArray(ignoredByKind?.[kind]) ? ignoredByKind[kind] : []),
    [ignoredByKind, kind],
  )

  const groups = useMemo(() => buildSimilarGroups(rows || [], { ignored }), [rows, ignored])

  const stats = useMemo(() => {
    if (!rows) return null
    let uses = 0
    let once = 0
    for (const row of rows) {
      uses += row.usageCount
      if (row.usageCount === 1) once += 1
    }
    return { distinct: rows.length, uses, once, groups: groups.length }
  }, [rows, groups])

  // Values that belong to at least one live look-alike group — the "needs a
  // decision" slice of the table view.
  const similarValues = useMemo(() => {
    const set = new Set()
    for (const group of groups) for (const member of group.members) set.add(member.value)
    return set
  }, [groups])

  const query = collapseVocabularyText(search)

  const filtered = useMemo(() => {
    let list = rows || []
    if (view === 'once') list = list.filter((row) => row.usageCount === 1)
    else if (view === 'similar') list = list.filter((row) => similarValues.has(row.value))
    if (query) list = list.filter((row) => row.value.includes(query))

    const sorted = [...list]
    sorted.sort((a, b) => {
      if (sort === 'uses-asc') return a.usageCount - b.usageCount || a.value.localeCompare(b.value)
      if (sort === 'az') return a.value.localeCompare(b.value)
      if (sort === 'za') return b.value.localeCompare(a.value)
      return b.usageCount - a.usageCount || a.value.localeCompare(b.value)
    })
    return sorted
  }, [rows, view, query, sort, similarValues])

  const visibleGroups = useMemo(() => {
    if (!query) return groups
    return groups.filter((group) => group.members.some((m) => m.value.includes(query)))
  }, [groups, query])

  const maxUsage = useMemo(
    () => filtered.reduce((max, row) => Math.max(max, row.usageCount), 0),
    [filtered],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const selectedItems = useMemo(
    () => [...selected].map((value) => ({ value, usageCount: usageByValue.get(value) ?? 0 })),
    [selected, usageByValue],
  )

  const allOnPageSelected = pageRows.length > 0 && pageRows.every((row) => selected.has(row.value))

  // ── Selection ──────────────────────────────────────────────────────────────

  const toggleValue = (value) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  const togglePage = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allOnPageSelected) pageRows.forEach((row) => next.delete(row.value))
      else pageRows.forEach((row) => next.add(row.value))
      return next
    })
  }

  const selectAllMatching = () => setSelected(new Set(filtered.map((row) => row.value)))

  // ── Mutations ──────────────────────────────────────────────────────────────

  const handleRename = async (to) => {
    if (!renameTarget) return
    setBusy('rename')
    try {
      const result = await renameVocabularyValue(kind, renameTarget.value, to)
      const parts = [`${formatNumber(result.renamed)} record${result.renamed === 1 ? '' : 's'} updated`]
      if (result.merged > 0) {
        parts.push(`${formatNumber(result.merged)} duplicate${result.merged === 1 ? '' : 's'} merged`)
      }
      toast.success(`“${renameTarget.value}” → “${result.to}”`, parts.join(' · '))
      setRenameTarget(null)
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(renameTarget.value)
        return next
      })
      await load(kind)
    } catch (err) {
      toast.apiError(err, `Could not rename this ${meta.label.toLowerCase()}`)
    } finally {
      setBusy('')
    }
  }

  // Merge = one rename per doomed value. The API renames a single value at a
  // time, so we walk them sequentially (keeping the server's set-based work
  // serialised) and report one summary at the end.
  const runMerge = async (target, values, groupKey = '') => {
    const doomed = values.filter((value) => value !== target)
    if (doomed.length === 0) return

    setBusy('merge')
    setBusyGroupKey(groupKey)
    setProgress({ done: 0, total: doomed.length })

    let renamed = 0
    let merged = 0
    const failures = []

    for (const value of doomed) {
      try {
        const result = await renameVocabularyValue(kind, value, target)
        renamed += result.renamed
        merged += result.merged
      } catch (err) {
        failures.push(value)
        // Keep the first failure's detail; the rest are almost always the same
        // cause (permission, network) and one toast is enough.
        if (failures.length === 1) toast.apiError(err, `Could not merge “${value}”`)
      }
      setProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev))
    }

    if (failures.length < doomed.length) {
      const parts = [`${formatNumber(renamed)} record${renamed === 1 ? '' : 's'} rewritten`]
      if (merged > 0) parts.push(`${formatNumber(merged)} duplicate${merged === 1 ? '' : 's'} merged`)
      if (failures.length > 0) parts.push(`${failures.length} failed`)
      toast.success(
        `${doomed.length - failures.length} value${doomed.length - failures.length === 1 ? '' : 's'} merged into “${target}”`,
        parts.join(' · '),
      )
    }

    setBusy('')
    setBusyGroupKey('')
    setProgress(null)
    setMergeValues(null)
    setSelected(new Set())
    await load(kind)
  }

  const handleDeleteOne = async () => {
    if (!deleteTarget) return
    setBusy('delete')
    try {
      const result = await deleteVocabularyValue(kind, deleteTarget.value)
      toast.success(
        `“${result.value}” deleted`,
        `Removed from ${formatNumber(result.deleted)} record${result.deleted === 1 ? '' : 's'}, trashed ones included.`,
      )
      setDeleteTarget(null)
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(deleteTarget.value)
        return next
      })
      await load(kind)
    } catch (err) {
      toast.apiError(err, `Could not delete this ${meta.label.toLowerCase()}`)
    } finally {
      setBusy('')
    }
  }

  const handleBulkDelete = async () => {
    const values = [...selected]
    if (values.length === 0) return

    setBusy('delete')
    setProgress({ done: 0, total: values.length })

    let deleted = 0
    const failures = []
    for (const value of values) {
      try {
        const result = await deleteVocabularyValue(kind, value)
        deleted += result.deleted
      } catch (err) {
        failures.push(value)
        if (failures.length === 1) toast.apiError(err, `Could not delete “${value}”`)
      }
      setProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev))
    }

    if (failures.length < values.length) {
      toast.success(
        `${values.length - failures.length} ${meta.plural.toLowerCase()} deleted`,
        `Stripped from ${formatNumber(deleted)} record use${deleted === 1 ? '' : 's'}${failures.length > 0 ? ` · ${failures.length} failed` : ''}.`,
      )
    }

    setBusy('')
    setProgress(null)
    setBulkDeleteOpen(false)
    setSelected(new Set())
    await load(kind)
  }

  const ignoreGroup = (key) => {
    setIgnoredByKind((prev) => {
      const current = Array.isArray(prev?.[kind]) ? prev[kind] : []
      if (current.includes(key)) return prev
      return { ...prev, [kind]: [...current, key] }
    })
  }

  const clearIgnored = () => setIgnoredByKind((prev) => ({ ...prev, [kind]: [] }))

  const ignoredCount = Array.isArray(ignoredByKind?.[kind]) ? ignoredByKind[kind].length : 0
  const isMutating = busy !== ''

  // Typing the value back is the confirmation for a delete — except for long
  // keyword phrases, where retyping 200 characters of Sorani is a punishment
  // rather than a safeguard. Those fall back to the word DELETE.
  const deleteToken =
    deleteTarget && deleteTarget.value.length <= 24 ? deleteTarget.value : 'DELETE'

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AdminEntityPage
      title="Tags & Keywords"
      description="The shared vocabulary behind search and autocomplete. Renaming or deleting a value here rewrites every record that carries it — in one pass."
      action={
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => load(kind)}
          disabled={isLoading || isMutating}
        >
          <RefreshCw className={cn('size-4', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      }
    >
      {/* Kind switcher — one screen, two vocabularies. */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
          {VOCABULARY_KINDS.map((candidate) => {
            const candidateMeta = vocabularyMeta(candidate)
            const Icon = KIND_ICONS[candidate]
            const isActive = candidate === kind
            return (
              <button
                key={candidate}
                type="button"
                onClick={() => !isMutating && setKind(candidate)}
                disabled={isMutating}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-pressed={isActive}
              >
                <Icon className="size-4" />
                {candidateMeta.plural}
              </button>
            )
          })}
        </div>
        <p className="min-w-0 flex-1 text-xs leading-5 text-muted-foreground">{meta.blurb}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <VocabStatCard
          label={`Distinct ${meta.plural.toLowerCase()}`}
          value={stats ? formatNumber(stats.distinct) : '—'}
          icon={KIND_ICONS[kind]}
          accent="text-primary"
          isLoading={isLoading && !rows}
        />
        <VocabStatCard
          label="Total uses"
          value={stats ? formatNumber(stats.uses) : '—'}
          hint="Across live records only"
          icon={Layers}
          accent="text-sky-600 dark:text-sky-400"
          isLoading={isLoading && !rows}
        />
        <VocabStatCard
          label="Used exactly once"
          value={stats ? formatNumber(stats.once) : '—'}
          hint="Typos and orphans live here"
          icon={Sparkles}
          accent="text-amber-600 dark:text-amber-400"
          isLoading={isLoading && !rows}
        />
        <VocabStatCard
          label="Look-alike groups"
          value={stats ? formatNumber(stats.groups) : '—'}
          hint="Same word, different spelling"
          icon={Combine}
          accent="text-emerald-600 dark:text-emerald-400"
          isLoading={isLoading && !rows}
        />
      </div>

      {/* Search · view · sort */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardContent className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${meta.plural.toLowerCase()}…`}
              className="pl-8 pr-8"
              autoComplete="off"
              spellCheck={false}
            />
            {search ? <SearchClearButton onClick={() => setSearch('')} /> : null}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <VocabFilterChip
              label="All"
              count={stats?.distinct}
              isActive={view === 'all'}
              onClick={() => setView('all')}
            />
            <VocabFilterChip
              label="Used once"
              icon={Sparkles}
              count={stats?.once}
              isActive={view === 'once'}
              onClick={() => setView('once')}
            />
            <VocabFilterChip
              label="Look-alikes"
              icon={Combine}
              count={stats?.groups}
              isActive={view === 'similar'}
              onClick={() => setView('similar')}
            />
          </div>

          {view === 'similar' ? (
            ignoredCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2 text-xs text-muted-foreground"
                onClick={clearIgnored}
              >
                <X className="size-3" />
                Restore {ignoredCount} dismissed
              </Button>
            ) : null
          ) : (
            <Select
              value={sort}
              onChange={setSort}
              size="sm"
              ariaLabel="Sort by"
              className="w-[11rem]"
              options={SORT_OPTIONS}
            />
          )}

          <span className="text-xs text-muted-foreground lg:ms-auto">
            {isLoading && !rows
              ? 'Loading…'
              : view === 'similar'
              ? `${formatNumber(visibleGroups.length)} group${visibleGroups.length === 1 ? '' : 's'}`
              : `${formatNumber(filtered.length)} shown`}
          </span>
        </CardContent>
      </Card>

      {/* Bulk bar — only when something is ticked. */}
      {selected.size > 0 ? (
        <Card className="border-primary/30 bg-primary/5 shadow-sm">
          <CardContent className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="text-sm font-semibold text-foreground">
              {formatNumber(selected.size)} selected
            </span>
            {selected.size < filtered.length ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={selectAllMatching}
              >
                Select all {formatNumber(filtered.length)} matching
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
            <div className="ms-auto flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                disabled={isMutating}
                onClick={() => setMergeValues(selectedItems)}
              >
                <Combine className="size-3.5" />
                Merge into one
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-destructive/40 text-xs text-destructive hover:bg-destructive/10"
                disabled={isMutating}
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-destructive/40 bg-destructive/5 shadow-sm">
          <CardContent className="flex items-start gap-3 px-4 py-3">
            <TriangleAlert className="mt-0.5 size-4 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-destructive">
                Could not load the {meta.plural.toLowerCase()}
              </p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => load(kind)}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {truncated ? (
        <Card className="border-amber-500/40 bg-amber-500/5 shadow-sm">
          <CardContent className="flex items-start gap-3 px-4 py-3">
            <TriangleAlert className="mt-0.5 size-4 text-amber-600 dark:text-amber-400" />
            <p className="text-xs leading-5 text-muted-foreground">
              This vocabulary is larger than the {formatNumber(rows?.length ?? 0)} values loaded
              here. Counts and look-alike grouping cover the loaded slice only — narrow the archive
              or raise the cap in <code className="font-mono">services/vocabulary.js</code> if you
              need the rest.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Body: skeleton → empty → (groups | table) */}
      {isLoading && !rows ? (
        <Card className="border-border bg-card shadow-sm shadow-black/5">
          <div className="divide-y divide-border">
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-7 w-20" />
              </div>
            ))}
          </div>
        </Card>
      ) : view === 'similar' ? (
        visibleGroups.length === 0 ? (
          <EmptyState
            icon={Combine}
            title="No look-alikes found"
            description={`Nothing in this vocabulary spells the same word two ways — every ${meta.label.toLowerCase()} is already distinct.`}
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {visibleGroups.map((group) => (
              <SimilarGroupCard
                key={group.key}
                group={group}
                isBusy={isMutating}
                isRunning={busyGroupKey === group.key}
                onMerge={(keeper, values) => runMerge(keeper, values, group.key)}
                onIgnore={ignoreGroup}
              />
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={KIND_ICONS[kind]}
          title={
            rows && rows.length === 0
              ? `No ${meta.plural.toLowerCase()} yet`
              : `No ${meta.plural.toLowerCase()} match`
          }
          description={
            rows && rows.length === 0
              ? `${meta.plural} appear here as soon as a record carries one.`
              : 'Try a shorter search, or switch back to the All view.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/5">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[44px]">
                  <input
                    type="checkbox"
                    className="size-3.5 align-middle"
                    checked={allOnPageSelected}
                    onChange={togglePage}
                    aria-label="Select every value on this page"
                  />
                </TableHead>
                <TableHead>{meta.label}</TableHead>
                <TableHead className="w-[220px]">Uses</TableHead>
                <TableHead className="w-[170px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((row) => {
                const isSelected = selected.has(row.value)
                const isLooseEnd = row.usageCount === 1
                return (
                  <TableRow key={row.value} className={cn('group', isSelected && 'bg-primary/5')}>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="size-3.5 align-middle"
                        checked={isSelected}
                        onChange={() => toggleValue(row.value)}
                        aria-label={`Select ${row.value}`}
                      />
                    </TableCell>
                    <TableCell className="max-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          <Highlight text={row.value} query={search} />
                        </span>
                        {similarValues.has(row.value) ? (
                          <span
                            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300"
                            title="Another value spells this the same way"
                          >
                            <Combine className="size-3" />
                            Look-alike
                          </span>
                        ) : null}
                        {isLooseEnd ? (
                          <span className="inline-flex shrink-0 items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                            Used once
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <UsageMeter value={row.usageCount} max={maxUsage} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-xs"
                          disabled={isMutating}
                          onClick={() => setRenameTarget(row)}
                        >
                          <Pencil className="size-3" />
                          Rename
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-xs text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400"
                          disabled={isMutating}
                          onClick={() => setDeleteTarget(row)}
                        >
                          <Trash2 className="size-3" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {view !== 'similar' ? (
        <DataPagination
          page={safePage}
          totalPages={filtered.length > 0 ? totalPages : 0}
          totalElements={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      ) : null}

      {/* The two footnotes that stop an admin from being surprised later. */}
      <p className="px-1 text-[11px] leading-5 text-muted-foreground">
        Usage counts cover live records; a rename or delete also rewrites trashed ones, so a
        restored record never brings an old value back. Person records keep their own free-text
        tag and keyword fields — those are separate from this vocabulary and are never touched
        here.
      </p>

      <VocabularyRenameDialog
        open={Boolean(renameTarget)}
        kind={kind}
        item={renameTarget}
        existing={usageByValue}
        isProcessing={busy === 'rename'}
        onSubmit={handleRename}
        onOpenChange={(next) => !isMutating && setRenameTarget(next ? renameTarget : null)}
      />

      <VocabularyMergeDialog
        open={Boolean(mergeValues)}
        kind={kind}
        items={mergeValues || []}
        existing={usageByValue}
        isProcessing={busy === 'merge'}
        progress={progress}
        onSubmit={(target) => runMerge(target, (mergeValues || []).map((item) => item.value))}
        onOpenChange={(next) => !isMutating && setMergeValues(next ? mergeValues : null)}
      />

      <TypedConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete “${deleteTarget?.value || ''}” everywhere?`}
        description={`This strips the ${meta.label.toLowerCase()} from every record that carries it — ${formatNumber(deleteTarget?.usageCount || 0)} live use${deleteTarget?.usageCount === 1 ? '' : 's'}, plus any trashed ones. The records themselves are untouched; only this value disappears. There is no undo.`}
        codeToConfirm={deleteToken}
        promptLabel={
          deleteToken === 'DELETE'
            ? 'That value is long — type this word instead'
            : `Type the ${meta.label.toLowerCase()} to confirm`
        }
        caseSensitive={false}
        confirmLabel={busy === 'delete' ? 'Deleting…' : 'Delete everywhere'}
        isProcessing={busy === 'delete'}
        onConfirm={handleDeleteOne}
        onOpenChange={(next) => !isMutating && setDeleteTarget(next ? deleteTarget : null)}
      />

      <TypedConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${formatNumber(selected.size)} ${selected.size === 1 ? meta.label.toLowerCase() : meta.plural.toLowerCase()}?`}
        description={`Every selected value is stripped from all records — live and trashed — covering ${formatNumber(selectedItems.reduce((sum, item) => sum + item.usageCount, 0))} live use${selectedItems.reduce((sum, item) => sum + item.usageCount, 0) === 1 ? '' : 's'}. The records stay; the values are gone. There is no undo.${progress ? ` (${progress.done} of ${progress.total} done)` : ''}`}
        codeToConfirm="DELETE"
        promptLabel="Type this word to confirm"
        confirmLabel={busy === 'delete' ? 'Deleting…' : `Delete ${formatNumber(selected.size)}`}
        isProcessing={busy === 'delete'}
        onConfirm={handleBulkDelete}
        onOpenChange={(next) => !isMutating && setBulkDeleteOpen(Boolean(next))}
      />
    </AdminEntityPage>
  )
}

export { AdminVocabularyPage }
