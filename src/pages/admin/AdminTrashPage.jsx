import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AudioLines,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  RotateCcw,
  Tags,
  Trash2,
  UsersRound,
  Video as VideoIcon,
} from 'lucide-react'

import { AdminEntityPage } from '@/components/admin/AdminEntityPage'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CodeBadge } from '@/components/ui/code-badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { DataPagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { TypedConfirmDialog } from '@/components/ui/typed-confirm-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { formatApiError, getErrorMessage } from '@/lib/get-error-message'
import { getAudioTrashPage, purgeAudio, restoreAudio } from '@/services/audio'
import { getCategoryTrashPage, purgeCategory, restoreCategory } from '@/services/category'
import { getImageTrashPage, purgeImage, restoreImage } from '@/services/image'
import { getPersonTrashPage, purgePerson, restorePerson } from '@/services/person'
import { getProjectTrashPage, purgeProject, restoreProject } from '@/services/project'
import { getTextTrashPage, purgeText, restoreText } from '@/services/text'
import { getVideoTrashPage, purgeVideo, restoreVideo } from '@/services/video'

const TRASH_PAGE_SIZE = 100

// Per-entity adapters: how to fetch a trash page, how to restore one row,
// how to permanently delete it, the warning copy for purge (the cascade /
// in-use semantics differ across entity types), and how to project the
// row into the shared table layout. Keeps the rendering loop flat instead
// of forking on `kind` everywhere.
const ENTITIES = {
  category: {
    label: 'Categories',
    icon: Tags,
    fetchPage: getCategoryTrashPage,
    restore: restoreCategory,
    purge: purgeCategory,
    purgeWarning:
      'This will permanently delete the category. Blocked if any project — active or trashed — still references it; purge those projects first.',
    project: (r) => ({ code: r.categoryCode, title: r.name || r.categoryCode, subtitle: null }),
  },
  person: {
    label: 'Persons',
    icon: UsersRound,
    fetchPage: getPersonTrashPage,
    restore: restorePerson,
    purge: purgePerson,
    purgeWarning:
      'This will permanently delete the person. Blocked if any project — active or trashed — still references them; purge those projects first.',
    project: (r) => ({
      code: r.personCode,
      title: r.fullName || r.personCode,
      subtitle: r.nickname || null,
    }),
  },
  project: {
    label: 'Projects',
    icon: FolderOpen,
    fetchPage: getProjectTrashPage,
    restore: restoreProject,
    purge: purgeProject,
    purgeWarning:
      'CASCADE: this permanently deletes the project AND every audio, video, image, and text linked to it — both the database rows and the S3 files. The linked person and categories are not affected. This cannot be undone.',
    project: (r) => ({
      code: r.projectCode,
      title: r.projectName || r.projectCode,
      subtitle: r.personName || r.personCode || 'Untitled',
    }),
  },
  audio: {
    label: 'Audio',
    icon: AudioLines,
    fetchPage: getAudioTrashPage,
    restore: restoreAudio,
    purge: purgeAudio,
    purgeWarning:
      'This permanently deletes the audio record and removes the file from S3. This cannot be undone.',
    project: (r) => ({
      code: r.audioCode,
      title: r.originTitle || r.alterTitle || r.fullName || r.audioCode,
      subtitle: r.projectName || r.projectCode || null,
    }),
  },
  video: {
    label: 'Video',
    icon: VideoIcon,
    fetchPage: getVideoTrashPage,
    restore: restoreVideo,
    purge: purgeVideo,
    purgeWarning:
      'This permanently deletes the video record and removes the file from S3. This cannot be undone.',
    project: (r) => ({
      code: r.videoCode,
      title: r.originalTitle || r.alternativeTitle || r.fileName || r.videoCode,
      subtitle: r.projectName || r.projectCode || null,
    }),
  },
  image: {
    label: 'Image',
    icon: ImageIcon,
    fetchPage: getImageTrashPage,
    restore: restoreImage,
    purge: purgeImage,
    purgeWarning:
      'This permanently deletes the image record and removes the file from S3. This cannot be undone.',
    project: (r) => ({
      code: r.imageCode,
      title: r.originalTitle || r.alternativeTitle || r.fileName || r.imageCode,
      subtitle: r.projectName || r.projectCode || null,
    }),
  },
  text: {
    label: 'Text',
    icon: FileText,
    fetchPage: getTextTrashPage,
    restore: restoreText,
    purge: purgeText,
    purgeWarning:
      'This permanently deletes the text record and removes the file from S3. This cannot be undone.',
    project: (r) => ({
      code: r.textCode,
      title: r.originalTitle || r.alternativeTitle || r.fileName || r.textCode,
      subtitle: r.projectName || r.projectCode || null,
    }),
  },
}

const TAB_ORDER = ['category', 'person', 'project', 'audio', 'video', 'image', 'text']

function formatInstant(instant) {
  if (!instant) return null
  try {
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(instant))
  } catch {
    return String(instant)
  }
}

function AdminTrashPage() {
  const toast = useToast()

  const [activeTab, setActiveTab] = useState('category')

  // Per-tab page state. We track each tab independently so switching
  // tabs preserves where the admin was (page, last-known total) without
  // refetching unnecessarily. Initial state shape is the same for all.
  const initialState = () => ({
    rows: null,
    page: 0,
    totalPages: 0,
    totalElements: 0,
    isLoading: false,
    error: '',
  })
  const [tabs, setTabs] = useState(() =>
    TAB_ORDER.reduce((acc, kind) => {
      acc[kind] = initialState()
      return acc
    }, {}),
  )

  const [pendingRestore, setPendingRestore] = useState(null) // { kind, code, title }
  const [isProcessing, setIsProcessing] = useState(false)

  // Purge has its own state because it uses a typed-confirm dialog (the
  // user has to type the code) and its in-flight flag shouldn't gate the
  // restore button — the two flows can be considered separately.
  const [pendingPurge, setPendingPurge] = useState(null)
  const [isPurging, setIsPurging] = useState(false)

  const loadTab = useCallback(async (kind, requestedPage) => {
    const adapter = ENTITIES[kind]
    setTabs((prev) => ({
      ...prev,
      [kind]: { ...prev[kind], isLoading: true, error: '' },
    }))
    try {
      const data = await adapter.fetchPage({
        page: requestedPage ?? 0,
        size: TRASH_PAGE_SIZE,
      })
      setTabs((prev) => ({
        ...prev,
        [kind]: {
          rows: data?.content || [],
          page: data?.number ?? requestedPage ?? 0,
          totalPages: data?.totalPages ?? 0,
          totalElements: data?.totalElements ?? 0,
          isLoading: false,
          error: '',
        },
      }))
    } catch (err) {
      setTabs((prev) => ({
        ...prev,
        [kind]: {
          ...prev[kind],
          isLoading: false,
          error: getErrorMessage(err, `Failed to load ${kind} trash`),
        },
      }))
    }
  }, [])

  // Eagerly load every tab on mount so the count badges next to each
  // tab name are accurate from the first paint, regardless of which tab
  // the admin opens. Each fetch is page=0 size=100 — cheap.
  useEffect(() => {
    TAB_ORDER.forEach((kind) => loadTab(kind, 0))
  }, [loadTab])

  // Restore — cascade-aware (V3 trash model).
  //
  //  - Restoring a project also restores every media record currently in
  //    that project's trash. Response shape includes per-type counts so
  //    we can show "Also restored 12 audios, 4 videos, 3 images" inline.
  //  - Restoring a person also restores every trashed project linked to
  //    that person, and each project itself cascade-restores its media.
  //    Response shape includes the list of restored project codes.
  //  - All other entities (category, audio/video/image/text) restore the
  //    single record with no cascade.
  //
  // After a cascading restore we also reload the affected sibling tabs
  // so their count badges drop in real-time, instead of staying stale
  // until the admin clicks Refresh.
  const handleRestoreConfirm = async () => {
    if (!pendingRestore) return
    const { kind, code, title } = pendingRestore
    setIsProcessing(true)
    try {
      const result = await ENTITIES[kind].restore(code)

      // Build the toast detail per entity type.
      let detail
      if (kind === 'project') {
        const a = result?.restoredAudios ?? 0
        const v = result?.restoredVideos ?? 0
        const i = result?.restoredImages ?? 0
        const t = result?.restoredTexts ?? 0
        const totalMedia = a + v + i + t
        if (totalMedia === 0) {
          detail = `${title} is back in the active list.`
        } else {
          // Only mention the non-zero buckets so the toast doesn't read
          // "0 audios, 4 videos, 0 images, 0 texts".
          const parts = []
          if (a > 0) parts.push(`${a} audio${a === 1 ? '' : 's'}`)
          if (v > 0) parts.push(`${v} video${v === 1 ? '' : 's'}`)
          if (i > 0) parts.push(`${i} image${i === 1 ? '' : 's'}`)
          if (t > 0) parts.push(`${t} text${t === 1 ? '' : 's'}`)
          detail = `${title} is back. Also restored ${parts.join(', ')}.`
        }
      } else if (kind === 'person') {
        const count = result?.restoredProjectsCount ?? 0
        const codes = Array.isArray(result?.restoredProjectCodes)
          ? result.restoredProjectCodes
          : []
        if (count === 0) {
          detail = `${title} is back in the active list.`
        } else {
          // Up to three codes inline + "+N more" tail; same pattern as
          // the Person delete toast so the two ends of the lifecycle
          // read symmetrically.
          const visible = codes.slice(0, 3).join(', ')
          const extra = codes.length - 3
          const codesPart = visible
            ? ` ${visible}${extra > 0 ? ` +${extra} more` : ''}`
            : ''
          detail =
            `${title} is back, along with ${count} project${count === 1 ? '' : 's'}` +
            ` (and their media):${codesPart}.`
        }
      } else {
        detail = `${title} is back in the active list.`
      }
      toast.success('Restored', detail)
      setPendingRestore(null)

      // Reload the active tab. For cascading restores, also reload the
      // sibling tabs whose counts dropped: project → 4 media tabs;
      // person → project tab + 4 media tabs.
      await loadTab(kind, tabs[kind].page)
      if (kind === 'project') {
        await Promise.all([
          loadTab('audio', tabs.audio.page),
          loadTab('video', tabs.video.page),
          loadTab('image', tabs.image.page),
          loadTab('text', tabs.text.page),
        ])
      } else if (kind === 'person') {
        await Promise.all([
          loadTab('project', tabs.project.page),
          loadTab('audio', tabs.audio.page),
          loadTab('video', tabs.video.page),
          loadTab('image', tabs.image.page),
          loadTab('text', tabs.text.page),
        ])
      }
    } catch (err) {
      // Backend blocks restoring a media record while its parent project
      // is still in trash — surface that message clearly so the admin
      // knows what to fix instead of getting a generic "could not restore".
      const message = formatApiError(err, `Could not restore ${kind}`)
      toast.apiError(err, message)
    } finally {
      setIsProcessing(false)
    }
  }

  // Permanent delete from trash (admin gate already enforced by the
  // backend on every /purge endpoint). When the active tab was project
  // and the cascade fired, the four media tabs need a refresh too —
  // their counts may have changed. Same when purging a person/category
  // succeeds: the dashboard's headline trash count needs to drop.
  const handlePurgeConfirm = async () => {
    if (!pendingPurge) return
    const { kind, code, title } = pendingPurge
    setIsPurging(true)
    try {
      await ENTITIES[kind].purge(code)
      toast.success(
        'Permanently deleted',
        kind === 'project'
          ? `${title} and its media were purged from trash.`
          : `${title} was purged from trash.`,
      )
      setPendingPurge(null)
      // Reload the active tab. For a project purge, also reload the four
      // media tabs since the cascade trashed many child rows.
      await loadTab(kind, tabs[kind].page)
      if (kind === 'project') {
        await Promise.all([
          loadTab('audio', tabs.audio.page),
          loadTab('video', tabs.video.page),
          loadTab('image', tabs.image.page),
          loadTab('text', tabs.text.page),
        ])
      }
    } catch (err) {
      // Person/Category purge is rejected by the backend with a clear
      // "still referenced by N project(s)" message — surface verbatim.
      toast.apiError(err, formatApiError(err, `Could not purge ${kind}`))
    } finally {
      setIsPurging(false)
    }
  }

  const totalRemoved = useMemo(
    () =>
      TAB_ORDER.reduce(
        (sum, kind) => sum + (tabs[kind].totalElements || 0),
        0,
      ),
    [tabs],
  )

  const activeAdapter = ENTITIES[activeTab]
  const activeState = tabs[activeTab]
  const ActiveIcon = activeAdapter.icon

  return (
    <AdminEntityPage
      title="Trash"
      description="Restore items moved to trash, or purge them permanently. Restoring a media record requires its parent project to be active. Purging a project cascades to its media; purging a person or category is blocked while any project still references them."
      action={
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => loadTab(activeTab, activeState.page)}
          disabled={activeState.isLoading}
        >
          <RefreshCw className={`size-4 ${activeState.isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
    >
      {/* ── Tab strip — 7 entity tabs, count badge per tab ─────────── */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card/60 p-1 shadow-sm">
        {TAB_ORDER.map((kind) => {
          const ent = ENTITIES[kind]
          const Icon = ent.icon
          const state = tabs[kind]
          const isActive = activeTab === kind
          return (
            <button
              key={kind}
              type="button"
              onClick={() => setActiveTab(kind)}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
              {ent.label}
              {state.totalElements > 0 ? (
                <span
                  className={cn(
                    'ml-1 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {state.totalElements.toLocaleString()}
                </span>
              ) : null}
            </button>
          )
        })}
        <div className="ml-auto pr-2 text-xs text-muted-foreground">
          {totalRemoved > 0
            ? `${totalRemoved.toLocaleString()} total in trash`
            : 'Nothing in trash'}
        </div>
      </div>

      {/* ── Active tab content ────────────────────────────────────── */}
      {activeState.isLoading && !activeState.rows ? (
        <Card className="border-border bg-card shadow-sm shadow-black/5">
          <div className="divide-y divide-border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-6 w-28 rounded-md" />
                <Skeleton className="h-5 w-64 rounded-md" />
                <Skeleton className="ml-auto h-7 w-24 rounded-md" />
              </div>
            ))}
          </div>
        </Card>
      ) : activeState.error ? (
        <Card className="border-border bg-card shadow-sm shadow-black/5">
          <CardContent className="flex flex-col items-start gap-4 px-6 py-8">
            <p className="text-sm text-destructive">{activeState.error}</p>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => loadTab(activeTab, activeState.page)}
            >
              <RefreshCw className="size-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : !activeState.rows || activeState.rows.length === 0 ? (
        <EmptyState
          icon={ActiveIcon}
          title="Nothing here"
          description="Items moved to trash from this section will show up here, ready to restore."
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/5">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[52px] text-center">#</TableHead>
                  <TableHead className="w-[260px]">Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[180px]">Removed by</TableHead>
                  <TableHead className="w-[180px]">Removed at</TableHead>
                  <TableHead className="w-[260px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeState.rows.map((raw, index) => {
                  const projected = activeAdapter.project(raw)
                  const absIdx = activeState.page * TRASH_PAGE_SIZE + index + 1
                  return (
                    <TableRow
                      key={`${activeTab}-${projected.code}`}
                      className="opacity-90"
                    >
                      <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                        {absIdx}
                      </TableCell>
                      <TableCell>
                        <CodeBadge code={projected.code} variant="subtle" />
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold leading-tight text-foreground">
                          {projected.title}
                        </div>
                        {projected.subtitle ? (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {projected.subtitle}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {raw.removedBy ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground/80">
                            <span
                              aria-hidden="true"
                              className="flex size-5 shrink-0 items-center justify-center rounded-full bg-background font-mono text-[10px] font-semibold uppercase text-muted-foreground"
                            >
                              {String(raw.removedBy).trim().charAt(0) || '?'}
                            </span>
                            <span className="truncate max-w-[120px]" title={raw.removedBy}>
                              {raw.removedBy}
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">unknown</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums text-muted-foreground">
                        {formatInstant(raw.removedAt) || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 px-2 text-xs"
                            onClick={() =>
                              setPendingRestore({
                                kind: activeTab,
                                code: projected.code,
                                title: projected.title,
                                raw,
                              })
                            }
                          >
                            <RotateCcw className="size-3.5" />
                            Restore
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 border-destructive/30 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() =>
                              setPendingPurge({
                                kind: activeTab,
                                code: projected.code,
                                title: projected.title,
                                raw,
                              })
                            }
                          >
                            <Trash2 className="size-3.5" />
                            Delete forever
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Server-side pagination per tab. The tab strip's count badge
              and the global "X total in trash" stat come from the same
              page response so everything stays consistent. */}
          {activeState.totalPages > 1 ? (
            <DataPagination
              page={activeState.page}
              totalPages={activeState.totalPages}
              totalElements={activeState.totalElements}
              pageSize={TRASH_PAGE_SIZE}
              onPageChange={(nextPage) => loadTab(activeTab, nextPage)}
              className="mt-4"
            />
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={Boolean(pendingRestore)}
        title="Restore item"
        description={(() => {
          if (!pendingRestore) return ''
          const { title, code, kind } = pendingRestore
          const head = `"${title}" (${code}) will be restored to the active list.`
          if (kind === 'project') {
            return `${head} Every audio, video, image, and text record currently in this project's trash will also come back with it.`
          }
          if (kind === 'person') {
            return `${head} Every trashed project linked to this person will also be restored, and each restored project cascade-restores its media.`
          }
          if (['audio', 'video', 'image', 'text'].includes(kind)) {
            return `${head} Note: this is blocked while the parent project is still in trash — restore the project first if so.`
          }
          return head
        })()}
        confirmLabel={
          isProcessing ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="size-3.5 animate-spin" />
              Restoring…
            </span>
          ) : (
            'Restore'
          )
        }
        cancelLabel="Cancel"
        confirmVariant="default"
        isProcessing={isProcessing}
        onConfirm={handleRestoreConfirm}
        onOpenChange={(open) => {
          if (!open) setPendingRestore(null)
        }}
      />

      {/* Purge — irreversible. Typed-confirm gate so admin can't fat-
          finger a permanent deletion. Description text is per-entity:
          a project warns about cascade + S3, a person/category warns
          about the in-use guard, media warns about S3 file removal. */}
      <TypedConfirmDialog
        open={Boolean(pendingPurge)}
        title="Permanently delete"
        description={
          pendingPurge
            ? `"${pendingPurge.title}" — ${ENTITIES[pendingPurge.kind].purgeWarning}`
            : ''
        }
        codeToConfirm={pendingPurge?.code}
        promptLabel={
          pendingPurge
            ? `To confirm, type the ${pendingPurge.kind} code`
            : 'To confirm, type the code'
        }
        confirmLabel="Delete Forever"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        isProcessing={isPurging}
        onConfirm={handlePurgeConfirm}
        onOpenChange={(open) => {
          if (!open) setPendingPurge(null)
        }}
      />
    </AdminEntityPage>
  )
}

export { AdminTrashPage }
