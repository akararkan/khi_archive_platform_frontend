import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AudioLines,
  CalendarDays,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  Tags,
  User as UserIcon,
  Video as VideoIcon,
} from 'lucide-react'

import {
  ErrorState,
  PageContainer,
  PageHeader,
  ResultCard,
  SectionTitle,
  TagPill,
} from '@/components/public/PublicShared'
import { formatPublicDate } from '@/components/public/public-helpers'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { guestProject, guestProjectMedia } from '@/services/guest'

const MEDIA_TABS = [
  { key: 'all', label: 'All', icon: Layers },
  { key: 'audio', label: 'Audios', icon: AudioLines, kind: 'audio' },
  { key: 'video', label: 'Videos', icon: VideoIcon, kind: 'video' },
  { key: 'text', label: 'Texts', icon: FileText, kind: 'text' },
  { key: 'image', label: 'Images', icon: ImageIcon, kind: 'image' },
]

function PublicProjectDetailPage() {
  const { code } = useParams()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('all')
  const [media, setMedia] = useState(null)
  const [mediaLoading, setMediaLoading] = useState(true)

  useEffect(() => {
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
     
    setError('')
    guestProject(code, { signal: ctrl.signal })
      .then((d) => setProject(d || null))
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED') return
        setError('Could not load this project.')
      })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [code])

  useEffect(() => {
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMediaLoading(true)
    guestProjectMedia(code, { type: tab === 'all' ? 'all' : tab, signal: ctrl.signal })
      .then((d) => setMedia(d || null))
      .catch(() => {})
      .finally(() => setMediaLoading(false))
    return () => ctrl.abort()
  }, [code, tab])

  const breadcrumbs = useMemo(
    () => [
      { to: '/public', label: 'Home' },
      { to: '/public/projects', label: 'Projects' },
      { label: project?.projectName || 'Untitled project' },
    ],
    [project],
  )

  if (loading) {
    return (
      <PageContainer>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-10 w-2/3" />
        <Skeleton className="mt-3 h-4 w-1/2" />
        <Skeleton className="mt-8 h-32 w-full rounded-2xl" />
      </PageContainer>
    )
  }
  if (error || !project) {
    return (
      <PageContainer>
        <ErrorState error={error || 'Project not found.'} />
      </PageContainer>
    )
  }

  return (
    <>
      <section className="border-b border-border/60 bg-gradient-to-b from-primary/5 via-background to-background">
        <PageContainer className="py-10 sm:py-14">
          <PageHeader
            eyebrow="Project"
            title={project.projectName || 'Untitled project'}
            description={project.description}
            breadcrumbs={breadcrumbs}
          />

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={AudioLines} label="Audios" value={project.audioCount} />
            <Stat icon={VideoIcon} label="Videos" value={project.videoCount} />
            <Stat icon={FileText} label="Texts" value={project.textCount} />
            <Stat icon={ImageIcon} label="Images" value={project.imageCount} />
          </div>
        </PageContainer>
      </section>

      <PageContainer>
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* ── Main: media tabs ─────────────────────────────── */}
          <div className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {MEDIA_TABS.map((t) => {
                const Icon = t.icon
                const active = tab === t.key
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                      active
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border bg-background text-foreground/80 hover:border-primary/30 hover:bg-primary/5 hover:text-primary',
                    )}
                  >
                    <Icon className="size-3.5" />
                    {t.label}
                  </button>
                )
              })}
            </div>

            <SectionTitle title="Media" />
            {mediaLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 rounded-2xl" />
                ))}
              </div>
            ) : (
              <MediaGrid media={media} tab={tab} />
            )}
          </div>

          {/* ── Sidebar: meta ─────────────────────────────────── */}
          <aside className="space-y-5 lg:sticky lg:top-32 lg:self-start">
            <Panel title="At a glance">
              {project.personCode ? (
                <Row icon={UserIcon} label="Person">
                  <Link
                    to={`/public/persons/${project.personCode}`}
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {project.personName || 'Untitled person'}
                  </Link>
                </Row>
              ) : (
                <Row icon={UserIcon} label="Person">
                  <span className="text-muted-foreground italic">No person linked</span>
                </Row>
              )}

              {Array.isArray(project.categories) && project.categories.length > 0 ? (
                <Row icon={Tags} label="Categories">
                  <div className="flex flex-wrap gap-1.5">
                    {project.categories.map((c) => (
                      <Link
                        key={c.categoryCode}
                        to={`/public/categories/${c.categoryCode}`}
                        className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground/80 hover:border-primary/30 hover:text-primary"
                      >
                        {c.categoryName || c.name || c.categoryCode}
                      </Link>
                    ))}
                  </div>
                </Row>
              ) : null}

              {project.createdAt ? (
                <Row icon={CalendarDays} label="Added">
                  <span className="text-foreground">{formatPublicDate(project.createdAt)}</span>
                </Row>
              ) : null}
            </Panel>

            {(project.tags?.length || project.keywords?.length) ? (
              <Panel title="Tags & keywords">
                {project.tags?.length ? (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Tags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {project.tags.map((t) => (
                        <TagPill key={t} tone="primary">{t}</TagPill>
                      ))}
                    </div>
                  </div>
                ) : null}
                {project.keywords?.length ? (
                  <div className="mt-3 space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Keywords
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {project.keywords.map((k) => (
                        <TagPill key={k}>{k}</TagPill>
                      ))}
                    </div>
                  </div>
                ) : null}
              </Panel>
            ) : null}
          </aside>
        </div>
      </PageContainer>
    </>
  )
}

function MediaGrid({ media, tab }) {
  // The /projects/{code}/media endpoint can return { audios: [...], videos: [...], ... }
  // when type=all, or a flat array / { content: [...] } when scoped to a single type.
  const groups = []
  if (tab === 'all' || tab === 'audio') {
    const items = pickArr(media, ['audios', 'audio'])
    if (items.length) groups.push({ kind: 'audio', label: 'Audios', items, listTo: '/public/audios' })
  }
  if (tab === 'all' || tab === 'video') {
    const items = pickArr(media, ['videos', 'video'])
    if (items.length) groups.push({ kind: 'video', label: 'Videos', items, listTo: '/public/videos' })
  }
  if (tab === 'all' || tab === 'text') {
    const items = pickArr(media, ['texts', 'text'])
    if (items.length) groups.push({ kind: 'text', label: 'Texts', items, listTo: '/public/texts' })
  }
  if (tab === 'all' || tab === 'image') {
    const items = pickArr(media, ['images', 'image'])
    if (items.length) groups.push({ kind: 'image', label: 'Images', items, listTo: '/public/images' })
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
        No media in this section yet.
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {groups.map((g) => (
        <section key={g.kind}>
          {tab === 'all' ? (
            <SectionTitle
              className="mb-3"
              title={g.label}
              description={`${g.items.length} record${g.items.length === 1 ? '' : 's'}`}
            />
          ) : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {g.items.map((item) => (
              <MediaResultCard key={mediaCode(item)} kind={g.kind} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function MediaResultCard({ kind, item }) {
  const code = mediaCode(item)
  const title = item.titleEnglish || item.titleOriginal || `Untitled ${kind}`
  const description = item.description
  const thumb = item.imageFileUrl || null
  const meta = []
  if (item.language) meta.push(item.language)
  if (item.dialect) meta.push(item.dialect)
  if (item.form) meta.push(item.form)
  if (item.event) meta.push(item.event)
  if (item.location) meta.push(item.location)
  if (item.documentType) meta.push(item.documentType)

  return (
    <ResultCard
      kind={kind}
      to={`/public/${kind}s/${code}`}
      title={title}
      description={description}
      meta={meta}
      image={kind === 'image' ? thumb : null}
    />
  )
}

function mediaCode(item) {
  return (
    item.audioCode ||
    item.videoCode ||
    item.textCode ||
    item.imageCode ||
    item.code ||
    item.id
  )
}

function pickArr(obj, keys) {
  if (!obj) return []
  if (Array.isArray(obj)) return obj
  for (const k of keys) {
    if (Array.isArray(obj[k])) return obj[k]
    if (Array.isArray(obj[k]?.content)) return obj[k].content
  }
  if (Array.isArray(obj.content)) return obj.content
  return []
}

function Stat(props) {
  const { icon: Icon, label, value } = props
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/5">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="font-heading text-lg font-semibold tabular-nums text-foreground">
            {Number.isFinite(value) ? value.toLocaleString() : '0'}
          </p>
        </div>
      </div>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-black/5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  )
}

function Row(props) {
  const { icon: Icon, label, children } = props
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  )
}

export { PublicProjectDetailPage }
