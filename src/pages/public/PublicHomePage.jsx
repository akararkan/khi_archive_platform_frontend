import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  AudioLines,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Search,
  Sparkles,
  Tags,
  Users,
  Video as VideoIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CardGridSkeleton,
  PageContainer,
  ResultCard,
  SectionTitle,
  StatCard,
} from '@/components/public/PublicShared'
import {
  projectMeta,
  readMediaTypeCount,
  totalFacetCount,
} from '@/components/public/public-helpers'
import { cn } from '@/lib/utils'
import { guestCategories, guestFacets, guestProjects } from '@/services/guest'

const MEDIA_TILES = [
  {
    label: 'Audio',
    description: 'Field recordings, music, oral histories.',
    to: '/public/audios',
    icon: AudioLines,
    accent: 'from-rose-500/15 to-rose-400/0 text-rose-600 dark:text-rose-400',
    facetKey: 'audio',
  },
  {
    label: 'Video',
    description: 'Documentary footage, interviews, performances.',
    to: '/public/videos',
    icon: VideoIcon,
    accent: 'from-sky-500/15 to-sky-400/0 text-sky-600 dark:text-sky-400',
    facetKey: 'video',
  },
  {
    label: 'Text',
    description: 'Manuscripts, transcriptions, scholarly notes.',
    to: '/public/texts',
    icon: FileText,
    accent: 'from-emerald-500/15 to-emerald-400/0 text-emerald-600 dark:text-emerald-400',
    facetKey: 'text',
  },
  {
    label: 'Image',
    description: 'Photographs, scans, posters, ephemera.',
    to: '/public/images',
    icon: ImageIcon,
    accent: 'from-amber-500/15 to-amber-400/0 text-amber-600 dark:text-amber-400',
    facetKey: 'image',
  },
]

function HeroSearch() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  // Hero search hands off to the unified browse page — that's where the
  // morph-search sidebar lives. We default the type to `audio` so the user
  // lands on the most-requested view; switching type from the sidebar is
  // one click away.
  const submit = (e) => {
    e.preventDefault()
    const trimmed = q.trim()
    const sp = new URLSearchParams({ type: 'audio' })
    if (trimmed) sp.set('q', trimmed)
    navigate(`/public/browse?${sp.toString()}`)
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto mt-8 flex w-full max-w-2xl items-center gap-2 rounded-full border border-border bg-background/80 p-1.5 pl-5 shadow-xl shadow-black/10 ring-1 ring-foreground/5 backdrop-blur-md focus-within:border-primary/40 focus-within:ring-primary/20"
    >
      <Search className="size-5 shrink-0 text-muted-foreground" />
      <input
        type="search"
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search persons, projects, audios, videos…"
        className="h-10 w-full min-w-0 bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
      />
      <Button type="submit" size="lg" className="gap-1.5 rounded-full px-5">
        Search
        <ArrowRight className="size-4" />
      </Button>
    </form>
  )
}

function PublicHomePage() {
  const [facets, setFacets] = useState(null)
  const [facetsLoading, setFacetsLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  useEffect(() => {
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFacetsLoading(true)
    guestFacets({ signal: ctrl.signal })
      .then((data) => setFacets(data || null))
      .catch(() => {})
      .finally(() => setFacetsLoading(false))

     
    setProjectsLoading(true)
    guestProjects({ size: 8, sortBy: 'createdAt', sortDirection: 'desc', signal: ctrl.signal })
      .then((data) => setProjects(data?.content || []))
      .catch(() => {})
      .finally(() => setProjectsLoading(false))

     
    setCategoriesLoading(true)
    guestCategories({ size: 12, signal: ctrl.signal })
      .then((data) => setCategories(data?.content || []))
      .catch(() => {})
      .finally(() => setCategoriesLoading(false))

    return () => ctrl.abort()
  }, [])

  const stats = useMemo(
    () => [
      { icon: AudioLines, label: 'Audios', value: readMediaTypeCount(facets, 'audio') },
      { icon: VideoIcon, label: 'Videos', value: readMediaTypeCount(facets, 'video') },
      { icon: FileText, label: 'Texts', value: readMediaTypeCount(facets, 'text') },
      { icon: ImageIcon, label: 'Images', value: readMediaTypeCount(facets, 'image') },
      { icon: Tags, label: 'Categories', value: totalFacetCount(facets, 'categories') },
      { icon: Users, label: 'Persons', value: totalFacetCount(facets, 'persons') },
    ],
    [facets],
  )

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden border-b border-border/60 bg-gradient-to-b from-primary/5 via-background to-background">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,oklch(var(--primary)/0.08),transparent)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        />
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            <Sparkles className="size-3.5" />
            Public Catalogue · Free Access
          </span>
          <h1 className="mt-6 max-w-3xl text-balance font-heading text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            A living archive of voices, images and texts.
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
            Search across thousands of audio recordings, videos, manuscripts and photographs —
            organised by person, project and category, with rich descriptive metadata.
          </p>
          <HeroSearch />

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Try:</span>
            {['Hesen Zirek', 'maqam', 'Sulaymaniyah', 'oral history'].map((tag) => (
              <Link
                key={tag}
                to={`/public/browse?type=audio&q=${encodeURIComponent(tag)}`}
                className="rounded-full border border-border bg-background px-2.5 py-0.5 font-medium text-foreground/80 hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────── */}
      <PageContainer className="-mt-10 sm:-mt-12">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {facetsLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/5"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-5 w-12" />
                    </div>
                  </div>
                </div>
              ))
            : stats.map((s) => (
                <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} />
              ))}
        </div>
      </PageContainer>

      {/* ── Browse by media type ──────────────────────────────── */}
      <PageContainer className="pt-2">
        <SectionTitle
          title="Browse by media"
          description="Pick a format and explore with rich filters."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MEDIA_TILES.map((tile) => {
            const Icon = tile.icon
            const facetCount = readMediaTypeCount(facets, tile.facetKey)
            return (
              <Link
                key={tile.to}
                to={tile.to}
                className={cn(
                  'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm shadow-black/5 transition-all',
                  'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-black/10',
                )}
              >
                <div
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-0 -z-10 bg-gradient-to-br opacity-90 transition-opacity group-hover:opacity-100',
                    tile.accent,
                  )}
                />
                <span className="flex size-11 items-center justify-center rounded-xl bg-background/80 ring-1 ring-foreground/10">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 font-heading text-xl font-semibold text-foreground">
                  {tile.label}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {tile.description}
                </p>
                <div className="mt-5 flex items-center justify-between text-xs">
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {facetCount != null ? `${Number(facetCount).toLocaleString()} records` : 'Browse'}
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-foreground transition-transform group-hover:translate-x-0.5">
                    Explore <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </PageContainer>

      {/* ── Featured projects ─────────────────────────────────── */}
      <PageContainer>
        <SectionTitle
          title="Featured projects"
          description="The most recent collections to land in the archive."
          action={
            <Link
              to="/public/projects"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              All projects
              <ArrowRight className="size-3.5" />
            </Link>
          }
        />
        {projectsLoading ? (
          <CardGridSkeleton count={8} />
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
            No projects published yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((p) => (
              <ResultCard
                key={p.projectCode}
                kind="project"
                to={`/public/projects/${p.projectCode}`}
                title={p.projectName}
                subtitle={p.projectCode}
                description={p.description}
                meta={projectMeta(p)}
              />
            ))}
          </div>
        )}
      </PageContainer>

      {/* ── Browse by category ────────────────────────────────── */}
      <PageContainer>
        <SectionTitle
          title="Browse by category"
          description="Topical entry points into the catalogue."
          action={
            <Link
              to="/public/categories"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              All categories
              <ArrowRight className="size-3.5" />
            </Link>
          }
        />
        {categoriesLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
            No categories yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((c) => (
              <Link
                key={c.categoryCode}
                to={`/public/categories/${c.categoryCode}`}
                className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Tags className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-heading text-sm font-semibold text-foreground group-hover:text-primary">
                    {c.name || c.categoryCode}
                  </span>
                  <span className="block truncate font-mono text-[11px] text-muted-foreground">
                    {c.categoryCode}
                  </span>
                </span>
                {Number.isFinite(c.projectCount) ? (
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {c.projectCount}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </PageContainer>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <PageContainer>
        <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-8 shadow-sm shadow-black/5 sm:p-10">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h3 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Contributing to the archive?
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Sign in with an authorised account to catalogue, edit, or upload media. Public
                visitors enjoy full read-only access — no account required.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button asChild variant="outline" size="lg">
                <Link to="/register">Create account</Link>
              </Button>
              <Button asChild size="lg" className="gap-1.5">
                <Link to="/login">
                  Sign in
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </PageContainer>
    </>
  )
}

export { PublicHomePage }
