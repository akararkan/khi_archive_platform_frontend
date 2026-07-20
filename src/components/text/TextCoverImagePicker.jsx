import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Check, ImagePlus, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useAuthedMediaUrl } from '@/hooks/use-authed-media-url'
import { cn } from '@/lib/utils'

const COVER_ACCEPT =
  'image/*,.avif,.bmp,.gif,.heic,.heif,.jfif,.jpe,.jpeg,.jpg,.jxl,.png,.raw,.svg,.tif,.tiff,.webp,.cr2,.cr3,.nef,.arw,.dng'

// `savedCoverPath` is a raw backend path (e.g. `/api/text/{code}/cover`) that
// requires a Bearer token — plain <img src> can't send one, so this fetches
// it as an authed blob. `pendingFile` is a local, unsaved File and is always
// safe to preview directly via a local blob: object URL.
function CoverArtwork({ savedCoverPath, pendingFile, alt, hasSelectedFile }) {
  const [failed, setFailed] = useState(false)
  const localPreviewUrl = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : ''),
    [pendingFile],
  )
  useEffect(() => {
    if (!localPreviewUrl) return undefined
    return () => URL.revokeObjectURL(localPreviewUrl)
  }, [localPreviewUrl])

  const { url: authedCoverUrl, loading } = useAuthedMediaUrl(savedCoverPath, {
    enabled: !pendingFile && Boolean(savedCoverPath),
  })
  const src = localPreviewUrl || authedCoverUrl

  if (loading && !src) {
    return (
      <div className="grid size-full place-items-center rounded-xl border border-dashed border-border bg-muted/25 text-muted-foreground">
        <div className="size-6 animate-pulse rounded-full bg-muted-foreground/20" />
      </div>
    )
  }

  if (!src || failed) {
    return (
      <div className="grid size-full place-items-center rounded-xl border border-dashed border-border bg-muted/25 text-muted-foreground">
        <div className="space-y-2 text-center">
          <BookOpen className="mx-auto size-9 opacity-70" strokeWidth={1.5} />
          <p className="px-3 text-[11px] leading-4">
            {src && failed ? 'This cover format cannot be previewed in this browser.' : 'No cover selected'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative size-full">
      <span
        aria-hidden="true"
        className="absolute inset-1 translate-x-2 translate-y-2 rounded-xl border border-amber-900/15 bg-amber-100/70 shadow-sm dark:bg-amber-950/30"
      />
      <img
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
        className="relative size-full rounded-xl border border-border bg-white object-contain shadow-xl shadow-black/15"
      />
      <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full border border-white/60 bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm">
        {hasSelectedFile ? <Check className="size-3" /> : <BookOpen className="size-3" />}
        {hasSelectedFile ? 'New cover' : 'Current cover'}
      </span>
    </div>
  )
}

/**
 * Controlled book/document-cover picker shared by text create/edit surfaces.
 * `file` is the pending multipart replacement; `currentUrl`/`currentCoverUrl`
 * is the *raw, unresolved* backend path for the cover already stored there
 * (e.g. `/api/text/{code}/cover`) — this component fetches it as an authed
 * blob itself since it requires a Bearer token a plain <img src> can't send.
 * Clearing a pending file reveals the current cover and never implies
 * deletion of that stored asset.
 */
function TextCoverImagePicker({
  id = 'text-cover-image',
  file,
  currentUrl,
  currentCoverUrl,
  onFileChange,
  disabled = false,
  className,
}) {
  const inputRef = useRef(null)
  const savedCoverPath = currentUrl || currentCoverUrl || ''

  const handlePicked = (event) => {
    const picked = event.target.files?.[0] || null
    event.target.value = ''
    if (picked) onFileChange?.(picked)
  }

  const clearPendingSelection = () => {
    if (inputRef.current) inputRef.current.value = ''
    onFileChange?.(null)
  }

  const hasPreview = Boolean(file || savedCoverPath)
  const selectedName = file?.name || ''

  return (
    <Card className={cn('overflow-hidden border-border bg-card shadow-sm shadow-black/5', className)}>
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-base font-semibold">Book / Document Cover</CardTitle>
        <CardDescription className="text-xs">
          Optional artwork shown on catalogue cards and at the top of the document page.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 pt-5 sm:grid-cols-[170px_minmax(0,1fr)] sm:items-center">
        <div className="mx-auto aspect-[2/3] w-full max-w-[170px]">
          <CoverArtwork
            key={file ? 'pending-file' : savedCoverPath || 'empty-cover'}
            savedCoverPath={savedCoverPath}
            pendingFile={file}
            alt={selectedName || 'Book or document cover'}
            hasSelectedFile={Boolean(file)}
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {file
                ? 'A new cover is ready to upload'
                : savedCoverPath
                  ? 'The saved cover will be kept'
                  : 'Add a cover to make this record easier to recognise'}
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              Portrait artwork works best. The complete image is contained without cropping, and the document file remains separate.
            </p>
          </div>

          {selectedName ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-2 text-xs text-foreground">
              <Check className="size-3.5 shrink-0 text-emerald-600" />
              <span className="min-w-0 truncate font-medium" title={selectedName}>{selectedName}</span>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Label
              htmlFor={id}
              aria-disabled={disabled}
              className={cn(
                'inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                disabled && 'pointer-events-none opacity-50',
              )}
            >
              <ImagePlus className="size-4" />
              {hasPreview ? 'Choose replacement' : 'Choose cover'}
            </Label>
            {file ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={clearPendingSelection}
                disabled={disabled}
              >
                <RotateCcw className="size-4" />
                {savedCoverPath ? 'Keep current cover' : 'Clear selection'}
              </Button>
            ) : null}
          </div>

          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={COVER_ACCEPT}
            onChange={handlePicked}
            disabled={disabled}
            className="sr-only"
          />
        </div>
      </CardContent>
    </Card>
  )
}

export { TextCoverImagePicker }
