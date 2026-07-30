import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  CircleAlert,
  Combine,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { collapseVocabularyText } from '@/lib/canonicalize-tag'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/pages/admin/analytics-constants'
import { vocabularyMeta } from '@/services/vocabulary'

// Shared furniture for the Tags & Keywords screen: the stat tiles, the filter
// chips, the usage meter, the two editing dialogs and the look-alike group
// card. Kept beside the page (the `*-shared.jsx` idiom already used by the
// analytics and user-audit screens) because none of it makes sense anywhere
// else in the app.

// ── Stat tile ────────────────────────────────────────────────────────────────

function VocabStatCard({ label, value, hint, icon, accent, isLoading }) {
  const Icon = icon
  return (
    <Card className="border-border bg-card shadow-sm shadow-black/5">
      <CardContent className="flex items-center gap-3 px-4 py-4">
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60',
            accent,
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          {isLoading ? (
            <Skeleton className="mt-1 h-6 w-14" />
          ) : (
            <p className="font-heading text-xl font-semibold tabular-nums text-foreground">
              {value}
            </p>
          )}
          {hint ? <p className="truncate text-[11px] text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Filter chip ──────────────────────────────────────────────────────────────

function VocabFilterChip({ label, count, icon, isActive, onClick }) {
  const Icon = icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        isActive
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground',
      )}
    >
      {Icon ? <Icon className="size-3.5" /> : null}
      {label}
      {typeof count === 'number' ? (
        <span
          className={cn(
            'rounded-full px-1.5 py-0 text-[10px] font-semibold tabular-nums',
            isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
          )}
        >
          {formatNumber(count)}
        </span>
      ) : null}
    </button>
  )
}

// ── Usage meter ──────────────────────────────────────────────────────────────
// A value's weight relative to the busiest value in the current view, so the
// long tail of one-off tags is obvious at a glance.

function UsageMeter({ value, max }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
        {formatNumber(value)}
      </span>
      <span
        className="h-1.5 w-full max-w-[7rem] overflow-hidden rounded-full bg-muted"
        aria-hidden="true"
      >
        <span
          className="block h-full rounded-full bg-primary/60"
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  )
}

// ── Value chip ───────────────────────────────────────────────────────────────

function VocabChip({ value, usageCount, tone = 'default', className }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
        tone === 'keep' && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        tone === 'drop' && 'border-border bg-muted/50 text-muted-foreground line-through',
        tone === 'default' && 'border-border bg-muted/40 text-foreground',
        className,
      )}
    >
      <span className="truncate font-medium">{value}</span>
      {typeof usageCount === 'number' ? (
        <span className="shrink-0 tabular-nums opacity-70">{formatNumber(usageCount)}</span>
      ) : null}
    </span>
  )
}

// ── Modal shell ──────────────────────────────────────────────────────────────
// Same backdrop + card treatment as ConfirmDialog, so the vocabulary dialogs
// sit in the family rather than inventing their own look.

function DialogShell({ open, title, icon, accent, isProcessing, onOpenChange, children, footer }) {
  useEffect(() => {
    if (!open) return undefined
    const handleEscape = (event) => {
      if (event.key === 'Escape' && !isProcessing) onOpenChange(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isProcessing, onOpenChange, open])

  if (!open) return null

  const Icon = icon
  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isProcessing) onOpenChange(false)
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto border-border bg-card shadow-lg shadow-black/15">
        <CardHeader className="space-y-3">
          <div
            className={cn(
              'flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary',
              accent,
            )}
          >
            <Icon className="size-5" />
          </div>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
        <CardFooter className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-6 py-4">
          {footer}
        </CardFooter>
      </Card>
    </div>
  )
}

// Live canonicalisation readout shared by both dialogs: shows the exact string
// the server will store, the character budget, and why a value is rejected.
function CanonicalPreview({ raw, maxLength, label = 'Saved as' }) {
  const collapsed = collapseVocabularyText(raw)
  const over = collapsed.length > maxLength
  const changed = collapsed !== raw
  if (!collapsed) return null
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <code
        className={cn(
          'max-w-full truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold',
          over ? 'text-destructive' : 'text-foreground',
        )}
      >
        {collapsed}
      </code>
      <span className={cn('tabular-nums', over ? 'text-destructive' : 'text-muted-foreground')}>
        {collapsed.length}/{maxLength}
      </span>
      {changed && !over ? (
        <span className="text-muted-foreground">· tidied automatically</span>
      ) : null}
    </div>
  )
}

function Notice({ tone = 'info', icon, children }) {
  const Icon = icon || CircleAlert
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-5',
        tone === 'warn' && 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
        tone === 'info' && 'border-border bg-muted/40 text-muted-foreground',
        tone === 'error' && 'border-destructive/40 bg-destructive/10 text-destructive',
      )}
    >
      <Icon className="mt-0.5 size-3.5 shrink-0" />
      <span className="min-w-0">{children}</span>
    </div>
  )
}

// ── Rename one value ─────────────────────────────────────────────────────────

function VocabularyRenameDialog({
  open,
  kind,
  item,
  // Map of value → usageCount for the whole vocabulary, so we can warn when
  // the new spelling already exists (a rename becomes a merge).
  existing,
  isProcessing = false,
  onSubmit,
  onOpenChange,
}) {
  const meta = vocabularyMeta(kind)
  const [raw, setRaw] = useState('')

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRaw(item?.value || '')
  }, [open, item])

  const collapsed = collapseVocabularyText(raw)
  const isBlank = collapsed.length === 0
  const isTooLong = collapsed.length > meta.maxLength
  const isUnchanged = collapsed === (item?.value || '')
  const mergeInto = !isUnchanged && existing ? existing.get(collapsed) : undefined
  const isMerge = typeof mergeInto === 'number'
  const canSubmit = !isBlank && !isTooLong && !isUnchanged && !isProcessing

  return (
    <DialogShell
      open={open}
      title={`Rename ${meta.label.toLowerCase()}`}
      icon={isMerge ? Combine : Sparkles}
      isProcessing={isProcessing}
      onOpenChange={onOpenChange}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="gap-2"
            disabled={!canSubmit}
            onClick={() => canSubmit && onSubmit(collapsed)}
          >
            {isProcessing ? <Loader2 className="size-4 animate-spin" /> : null}
            {isMerge ? 'Rename & merge' : 'Rename everywhere'}
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <VocabChip value={item?.value} usageCount={item?.usageCount} />
        <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">every record at once</span>
      </div>

      <div className="space-y-2">
        <Input
          autoFocus
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          placeholder={`New ${meta.label.toLowerCase()}…`}
          disabled={isProcessing}
          autoComplete="off"
          spellCheck={false}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && canSubmit) {
              event.preventDefault()
              onSubmit(collapsed)
            }
          }}
          aria-invalid={isTooLong}
          aria-label={`New ${meta.label.toLowerCase()}`}
        />
        <CanonicalPreview raw={raw} maxLength={meta.maxLength} />
      </div>

      {isTooLong ? (
        <Notice tone="error">
          Too long by {collapsed.length - meta.maxLength} character
          {collapsed.length - meta.maxLength === 1 ? '' : 's'}. The server rejects anything over{' '}
          {meta.maxLength}.
        </Notice>
      ) : null}

      {isUnchanged && !isBlank ? (
        <Notice>That is the current value — nothing to change.</Notice>
      ) : null}

      {isMerge ? (
        <Notice tone="warn" icon={Combine}>
          <span className="font-semibold">{collapsed}</span> already exists with{' '}
          {formatNumber(mergeInto)} use{mergeInto === 1 ? '' : 's'}. The two become one value, and
          any record carrying both keeps a single copy.
        </Notice>
      ) : null}

      <Notice>
        Applies to every {meta.owners.join(', ')} record carrying it — trashed ones included, so
        the old spelling cannot come back when a record is restored.
      </Notice>
    </DialogShell>
  )
}

// ── Merge many values into one ───────────────────────────────────────────────

function VocabularyMergeDialog({
  open,
  kind,
  items = [],
  existing,
  isProcessing = false,
  // { done, total } while the sequential renames run.
  progress,
  onSubmit,
  onOpenChange,
}) {
  const meta = vocabularyMeta(kind)
  const [keeper, setKeeper] = useState('')
  const [custom, setCustom] = useState('')

  // Default survivor: the most-used of the selected values.
  const busiest = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.usageCount - a.usageCount)
    return sorted[0]?.value || ''
  }, [items])

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKeeper(busiest)
    setCustom('')
  }, [open, busiest])

  const collapsedCustom = collapseVocabularyText(custom)
  const target = collapsedCustom || keeper
  const isTooLong = collapsedCustom.length > meta.maxLength
  const doomed = items.filter((item) => item.value !== target)
  const affected = doomed.reduce((sum, item) => sum + item.usageCount, 0)
  // A brand-new target still lands on an existing value if someone else
  // already uses that spelling.
  const outsideMatch = collapsedCustom && existing ? existing.get(collapsedCustom) : undefined
  const isOutsideMerge =
    typeof outsideMatch === 'number' && !items.some((item) => item.value === collapsedCustom)
  const canSubmit = Boolean(target) && doomed.length > 0 && !isTooLong && !isProcessing

  return (
    <DialogShell
      open={open}
      title={`Merge ${items.length} ${items.length === 1 ? meta.label.toLowerCase() : meta.plural.toLowerCase()}`}
      icon={Combine}
      isProcessing={isProcessing}
      onOpenChange={onOpenChange}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="gap-2"
            disabled={!canSubmit}
            onClick={() => canSubmit && onSubmit(target)}
          >
            {isProcessing ? <Loader2 className="size-4 animate-spin" /> : null}
            {isProcessing && progress
              ? `Merging ${progress.done + 1} of ${progress.total}…`
              : `Merge ${doomed.length} into one`}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-6 text-muted-foreground">
        Pick the spelling to keep. Every other selected value is rewritten to it across all
        records — the rest disappear from the vocabulary.
      </p>

      <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
        {items.map((item) => {
          const isKeeper = !collapsedCustom && item.value === keeper
          return (
            <button
              key={item.value}
              type="button"
              disabled={isProcessing || Boolean(collapsedCustom)}
              onClick={() => setKeeper(item.value)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                isKeeper ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60',
                collapsedCustom && 'opacity-50',
              )}
            >
              <span
                className={cn(
                  'flex size-4 shrink-0 items-center justify-center rounded-full border',
                  isKeeper ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                )}
              >
                {isKeeper ? <Check className="size-3" /> : null}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{item.value}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {formatNumber(item.usageCount)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="space-y-2">
        <Input
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          placeholder="…or type a different spelling to merge all of them into"
          disabled={isProcessing}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={isTooLong}
          aria-label={`Custom ${meta.label.toLowerCase()}`}
        />
        <CanonicalPreview raw={custom} maxLength={meta.maxLength} label="Merge into" />
      </div>

      {isTooLong ? (
        <Notice tone="error">
          Too long — {meta.plural.toLowerCase()} are capped at {meta.maxLength} characters.
        </Notice>
      ) : null}

      {isOutsideMerge ? (
        <Notice tone="warn" icon={Combine}>
          <span className="font-semibold">{collapsedCustom}</span> already exists with{' '}
          {formatNumber(outsideMatch)} use{outsideMatch === 1 ? '' : 's'}; the merge folds into it.
        </Notice>
      ) : null}

      {doomed.length === 0 ? (
        <Notice>Only one value is selected and it is the one you are keeping.</Notice>
      ) : (
        <Notice tone="warn">
          {doomed.length} value{doomed.length === 1 ? '' : 's'} disappear, up to{' '}
          {formatNumber(affected)} record use{affected === 1 ? '' : 's'} rewritten to{' '}
          <span className="font-semibold">{target}</span>. This cannot be undone in bulk.
        </Notice>
      )}

      {isProcessing && progress ? (
        <div className="space-y-1">
          <span className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <span
              className="block h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }}
            />
          </span>
          <p className="text-[11px] tabular-nums text-muted-foreground">
            {progress.done} of {progress.total} done — leave this page open.
          </p>
        </div>
      ) : null}
    </DialogShell>
  )
}

// ── Look-alike group ─────────────────────────────────────────────────────────

function SimilarGroupCard({ group, isBusy, isRunning, onMerge, onIgnore }) {
  const [keeper, setKeeper] = useState(group.keeper.value)

  const doomed = group.members.filter((m) => m.value !== keeper)

  return (
    <Card className="border-border bg-card shadow-sm shadow-black/5">
      <CardContent className="space-y-3 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {group.members.length} spellings · {formatNumber(group.totalUsage)} uses
            </p>
            <p className="truncate text-sm text-muted-foreground">
              Tap a value to make it the one that survives.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 gap-1 px-2 text-xs text-muted-foreground"
            onClick={() => onIgnore(group.key)}
            disabled={isBusy}
            title="Hide this suggestion"
          >
            <X className="size-3" />
            Not a duplicate
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {group.members.map((member) => (
            <button
              key={member.value}
              type="button"
              disabled={isBusy}
              onClick={() => setKeeper(member.value)}
              className="max-w-full"
              aria-pressed={member.value === keeper}
            >
              <VocabChip
                value={member.value}
                usageCount={member.usageCount}
                tone={member.value === keeper ? 'keep' : 'drop'}
                className={cn(
                  'transition-colors',
                  member.value === keeper ? '' : 'hover:border-primary/40 hover:text-foreground',
                )}
              />
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Keeping <span className="font-semibold text-foreground">{keeper}</span> · rewriting{' '}
            {doomed.length} other{doomed.length === 1 ? '' : 's'}
          </p>
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={isBusy || doomed.length === 0}
            onClick={() => onMerge(keeper, group.members.map((m) => m.value))}
          >
            {isRunning ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Combine className="size-3.5" />
            )}
            Merge into “{keeper.length > 24 ? `${keeper.slice(0, 24)}…` : keeper}”
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export {
  SimilarGroupCard,
  UsageMeter,
  VocabChip,
  VocabFilterChip,
  VocabStatCard,
  VocabularyMergeDialog,
  VocabularyRenameDialog,
}
