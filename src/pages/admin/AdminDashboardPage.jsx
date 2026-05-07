import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  AudioLines,
  FolderOpen,
  Image as ImageIcon,
  RefreshCw,
  ShieldCheck,
  Tags,
  Trash2,
  UsersRound,
  Video as VideoIcon,
} from 'lucide-react'

import { AdminEntityPage } from '@/components/admin/AdminEntityPage'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { getAudiosPage, getAudioTrashPage } from '@/services/audio'
import { getCategoriesPage, getCategoryTrashPage } from '@/services/category'
import { getImagesPage, getImageTrashPage } from '@/services/image'
import { getPersonsPage, getPersonTrashPage } from '@/services/person'
import { getProjectsPage, getProjectTrashPage } from '@/services/project'
import { getTextsPage, getTextTrashPage } from '@/services/text'
import { getVideosPage, getVideoTrashPage } from '@/services/video'

// Each tile shows totalElements (the full backend count) and links into
// the matching admin section. We fetch with size=1 so the network payload
// is minimal — we only need the count, not the rows.
const TILES = [
  { key: 'category', label: 'Categories', icon: Tags,        to: '/admin/category', accent: 'text-amber-600 dark:text-amber-400', fetch: () => getCategoriesPage({ size: 1 }) },
  { key: 'person',   label: 'Persons',    icon: UsersRound,  to: '/admin/person',   accent: 'text-violet-600 dark:text-violet-400', fetch: () => getPersonsPage({ size: 1 }) },
  { key: 'project',  label: 'Projects',   icon: FolderOpen,  to: '/admin/project',  accent: 'text-sky-600 dark:text-sky-400',       fetch: () => getProjectsPage({ size: 1 }) },
  { key: 'audio',    label: 'Audio',      icon: AudioLines,  to: null,              accent: 'text-rose-600 dark:text-rose-400',     fetch: () => getAudiosPage({ size: 1 }) },
  { key: 'video',    label: 'Video',      icon: VideoIcon,   to: null,              accent: 'text-emerald-600 dark:text-emerald-400', fetch: () => getVideosPage({ size: 1 }) },
  { key: 'image',    label: 'Image',      icon: ImageIcon,   to: null,              accent: 'text-orange-600 dark:text-orange-400', fetch: () => getImagesPage({ size: 1 }) },
  { key: 'text',     label: 'Text',       icon: ShieldCheck, to: null,              accent: 'text-teal-600 dark:text-teal-400',     fetch: () => getTextsPage({ size: 1 }) },
]

function AdminDashboardPage() {
  const [counts, setCounts] = useState({})
  const [removedTotal, setRemovedTotal] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadAll = useMemo(
    () => async () => {
      setIsLoading(true)
      setError('')
      try {
        const results = await Promise.allSettled(TILES.map((t) => t.fetch()))
        const next = {}
        results.forEach((r, i) => {
          next[TILES[i].key] = r.status === 'fulfilled' ? r.value?.totalElements ?? null : null
        })
        setCounts(next)

        // Trash count comes from the dedicated /trash endpoints across all
        // seven entities. Each call is `?size=1` so we only pay for the
        // count (totalElements), not the rows. Always exact, no client-side
        // filtering, no full-list fetch.
        const trashFetches = [
          getCategoryTrashPage({ size: 1 }),
          getPersonTrashPage({ size: 1 }),
          getProjectTrashPage({ size: 1 }),
          getAudioTrashPage({ size: 1 }),
          getVideoTrashPage({ size: 1 }),
          getImageTrashPage({ size: 1 }),
          getTextTrashPage({ size: 1 }),
        ]
        const trashResults = await Promise.allSettled(trashFetches)
        const removed = trashResults.reduce(
          (sum, r) =>
            sum + (r.status === 'fulfilled' ? r.value?.totalElements || 0 : 0),
          0,
        )
        setRemovedTotal(removed)
      } catch (err) {
        setError(err?.message || 'Failed to load dashboard counts')
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll()
  }, [loadAll])

  return (
    <AdminEntityPage
      title="Dashboard"
      description="Live counts across the archive. Click any card to jump straight into its workspace."
      action={
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={loadAll}
          disabled={isLoading}
        >
          <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
    >
      {error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="px-4 py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {/* Headline trash card — full-width, prominent, links to /admin/trash */}
      <Link
        to="/admin/trash"
        className={cn(
          'group block rounded-xl border bg-card shadow-sm shadow-black/5 transition-colors',
          (removedTotal ?? 0) > 0
            ? 'border-amber-500/40 hover:border-amber-500/60'
            : 'border-border hover:border-primary/40',
        )}
      >
        <div className="flex items-center gap-4 px-5 py-4">
          <div
            className={cn(
              'flex size-12 shrink-0 items-center justify-center rounded-xl',
              (removedTotal ?? 0) > 0
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'bg-muted text-muted-foreground',
            )}
          >
            <Trash2 className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Trash
            </p>
            <p className="text-lg font-semibold leading-tight text-foreground">
              {isLoading ? (
                <Skeleton as="span" className="inline-block h-5 w-24 align-middle" />
              ) : removedTotal == null ? (
                '—'
              ) : removedTotal === 0 ? (
                'Nothing removed'
              ) : (
                `${removedTotal.toLocaleString()} item${removedTotal === 1 ? '' : 's'} waiting to restore or delete`
              )}
            </p>
          </div>
          <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        </div>
      </Link>

      {/* Headline analytics card — sister to the Trash card. Links to
          /admin/analytics where admins can see per-user activity, daily
          trends, and the cross-entity feed. */}
      <Link
        to="/admin/analytics"
        className="group block rounded-xl border border-border bg-card shadow-sm shadow-black/5 transition-colors hover:border-primary/40"
      >
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Activity className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Analytics
            </p>
            <p className="text-lg font-semibold leading-tight text-foreground">
              See what every user is doing — counts, trends, and live feed
            </p>
          </div>
          <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        </div>
      </Link>

      {/* Entity stat tiles — totals, with click-through where a route exists */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {TILES.map((tile) => {
          const Icon = tile.icon
          const value = counts[tile.key]
          const inner = (
            <Card
              className={cn(
                'h-full border-border bg-card shadow-sm shadow-black/5 transition-colors',
                tile.to && 'group hover:border-primary/40',
              )}
            >
              <CardContent className="flex items-start gap-4 px-5 py-5">
                <div
                  className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted/60',
                    tile.accent,
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {tile.label}
                  </p>
                  <p className="font-heading text-2xl font-semibold tabular-nums leading-tight text-foreground">
                    {isLoading ? (
                      <Skeleton as="span" className="inline-block h-7 w-16 align-middle" />
                    ) : value == null ? (
                      '—'
                    ) : (
                      value.toLocaleString()
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {tile.to ? (
                      <span className="inline-flex items-center gap-1">
                        Open
                        <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    ) : (
                      'Total records'
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
          return tile.to ? (
            <Link key={tile.key} to={tile.to} className="block">
              {inner}
            </Link>
          ) : (
            <div key={tile.key}>{inner}</div>
          )
        })}
      </div>
    </AdminEntityPage>
  )
}

export { AdminDashboardPage }
