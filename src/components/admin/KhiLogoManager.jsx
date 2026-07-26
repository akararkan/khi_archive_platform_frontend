import { useEffect, useRef, useState } from 'react'
import { Check, ImageIcon, Loader2, RefreshCw, Trash2, Upload, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormErrorBox } from '@/components/ui/form-error'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { formatApiError } from '@/lib/get-error-message'
import {
  KHI_LOGO_FALLBACK_SRC,
  clearActiveKhiLogo,
  refreshActiveKhiLogo,
  resolveKhiLogoSrc,
  setActiveKhiLogo,
} from '@/lib/khi-logo'
import { cn } from '@/lib/utils'
import {
  ACCEPTED_LOGO_ACCEPT,
  deleteKhiLogo,
  replaceKhiLogo,
  uploadKhiLogo,
  validateLogoFile,
} from '@/services/khi-logo'

function formatTimestamp(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    parsed,
  )
}

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// Two swatches: the logo is drawn on light and on dark surfaces across the app
// (sidebar cards vs. the cinematic auth panel), so an admin should see both
// before committing to a file — a transparent PNG that looks right on white
// can disappear on the dark brand panel.
function LogoPreview({ src, label, tone }) {
  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex items-center justify-center gap-4 rounded-2xl border p-5',
          tone === 'dark'
            ? 'border-white/10 bg-[linear-gradient(135deg,#0f2f26,#1f5b47_58%,#10241d)]'
            : 'border-border bg-white',
        )}
      >
        <span className="inline-flex size-16 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-black/10">
          <img alt="" className="size-full object-cover" src={src} draggable="false" />
        </span>
        <img
          alt=""
          className="max-h-16 max-w-[9rem] object-contain"
          src={src}
          draggable="false"
        />
      </div>
      <p className="text-center text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
    </div>
  )
}

// Admin → Settings → Application logo.
//
// The logo is a database record (KHI_LOGO_FEATURE.md), never a file in the
// repo: upload once here and every surface — sidebars, auth screens, public
// header/footer, media watermark, printed reports — picks it up through the
// shared `lib/khi-logo` store.
function KhiLogoManager() {
  const toast = useToast()
  const inputRef = useRef(null)
  const previewUrlRef = useRef('')

  const [record, setRecord] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [file, setFile] = useState(null)
  const [filePreview, setFilePreview] = useState('')
  const [fileError, setFileError] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const [isSaving, setIsSaving] = useState(false)
  const [progress, setProgress] = useState(0)
  const [saveError, setSaveError] = useState(null)

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const current = await refreshActiveKhiLogo()
      setRecord(current ?? null)
    } catch (error) {
      setLoadError(formatApiError(error, 'Could not load the current logo.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const loadInitial = async () => {
      try {
        const current = await refreshActiveKhiLogo()
        if (!cancelled) setRecord(current ?? null)
      } catch (error) {
        if (!cancelled) setLoadError(formatApiError(error, 'Could not load the current logo.'))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadInitial()

    // The last preview blob outlives the effect that made it (it is created in
    // the picker, not here), so unmount is the only place left to free it.
    return () => {
      cancelled = true
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  // Preview blobs are swapped in the picker itself: the previous URL is revoked
  // the moment another file is chosen, so re-picking never leaks.
  const setPendingFile = (picked) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = picked ? URL.createObjectURL(picked) : ''
    setFile(picked)
    setFilePreview(previewUrlRef.current)
  }

  const chooseFile = (picked) => {
    if (!picked) return
    const message = validateLogoFile(picked)
    if (message) {
      setPendingFile(null)
      setFileError(message)
      return
    }
    setFileError('')
    setSaveError(null)
    setPendingFile(picked)
  }

  const clearFile = () => {
    setPendingFile(null)
    setFileError('')
    setSaveError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleInputChange = (event) => {
    chooseFile(event.target.files?.[0])
    // Always reset so re-picking the SAME file after an error still fires.
    event.target.value = ''
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    chooseFile(event.dataTransfer?.files?.[0])
  }

  const handleSave = async () => {
    if (!file) return

    setIsSaving(true)
    setSaveError(null)
    setProgress(0)

    const uploadOptions = {
      onUploadProgress: (event) => {
        if (!event.total) return
        setProgress(Math.round((event.loaded / event.total) * 100))
      },
    }

    try {
      // PATCH keeps the single logo row (and drops the old S3 object);
      // POST is only for the very first upload.
      const saved = record?.id != null
        ? await replaceKhiLogo(record.id, file, uploadOptions)
        : await uploadKhiLogo(file, uploadOptions)

      setRecord(saved)
      setActiveKhiLogo(saved)
      clearFile()
      toast.success(
        record?.id != null ? 'Logo replaced' : 'Logo uploaded',
        'Every page now shows the new logo.',
      )
    } catch (error) {
      setSaveError(formatApiError(error, 'Could not save the logo.'))
      toast.apiError(error, 'Could not save the logo')
    } finally {
      setIsSaving(false)
      setProgress(0)
    }
  }

  const handleDelete = async () => {
    if (record?.id == null) return

    setIsDeleting(true)
    try {
      await deleteKhiLogo(record.id)
      setRecord(null)
      clearActiveKhiLogo()
      setConfirmDeleteOpen(false)
      toast.success('Logo deleted', 'The app fell back to the built-in logo.')
    } catch (error) {
      setSaveError(formatApiError(error, 'Could not delete the logo.'))
      toast.apiError(error, 'Could not delete the logo')
      setConfirmDeleteOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const currentSrc = record ? resolveKhiLogoSrc(record) : KHI_LOGO_FALLBACK_SRC
  const previewSrc = filePreview || currentSrc
  const hasUploadedLogo = Boolean(record?.imageUrl)

  return (
    <Card className="border-border bg-card shadow-sm shadow-black/5">
      <CardHeader className="gap-1.5">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ImageIcon className="size-4 text-primary" />
          Application logo
        </CardTitle>
        <CardDescription>
          The logo is stored in the database, not in the app code. Upload it once here and it
          appears in every sidebar, the sign-in screens, the public header and footer, the media
          watermark, and printed reports.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        ) : (
          <>
            {loadError ? <FormErrorBox error={loadError} /> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <LogoPreview src={previewSrc} label="On light surfaces" tone="light" />
              <LogoPreview src={previewSrc} label="On the brand panel" tone="dark" />
            </div>

            <div className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-4 text-sm sm:grid-cols-3">
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Source
                </p>
                <p className="font-medium text-foreground">
                  {hasUploadedLogo ? `Database record #${record.id ?? '—'}` : 'Built-in fallback'}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Last updated
                </p>
                <p className="font-medium text-foreground">
                  {hasUploadedLogo ? formatTimestamp(record.updatedAt) : '—'}
                </p>
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  File
                </p>
                {hasUploadedLogo ? (
                  <a
                    className="block truncate font-mono text-xs text-primary hover:underline"
                    href={record.imageUrl}
                    rel="noreferrer"
                    target="_blank"
                    title={record.imageUrl}
                  >
                    {record.imageUrl}
                  </a>
                ) : (
                  <p className="font-mono text-xs text-muted-foreground">{KHI_LOGO_FALLBACK_SRC}</p>
                )}
              </div>
            </div>

            {file ? (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                  <Check className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(file.size)} · shown in the previews above, not saved yet
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Clear the selected file"
                  disabled={isSaving}
                  onClick={clearFile}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                className={cn(
                  'flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-5 py-9 text-center transition-colors',
                  isDragging
                    ? 'border-primary bg-primary/[0.06]'
                    : 'border-border bg-muted/20 hover:border-primary/50 hover:bg-primary/[0.03]',
                )}
                onClick={() => inputRef.current?.click()}
                onDragLeave={() => setIsDragging(false)}
                onDragOver={(event) => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                onDrop={handleDrop}
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-background text-primary shadow-sm ring-1 ring-border">
                  <Upload className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {hasUploadedLogo ? 'Choose a replacement logo' : 'Choose the logo image'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Drag a file here or click to browse
                  </p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    PNG, JPG, WEBP, AVIF, or SVG · up to 8 MB · a square image looks best
                  </p>
                </div>
              </button>
            )}

            {fileError ? (
              <p role="alert" className="text-xs font-medium text-destructive">
                {fileError}
              </p>
            ) : null}

            {saveError ? <FormErrorBox error={saveError} /> : null}

            {isSaving && progress > 0 ? (
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" disabled={!file || isSaving} onClick={handleSave}>
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {isSaving
                  ? `Uploading${progress ? ` ${progress}%` : ''}…`
                  : hasUploadedLogo
                    ? 'Replace logo'
                    : 'Upload logo'}
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={isLoading || isSaving}
                onClick={load}
              >
                <RefreshCw className="size-4" />
                Refresh
              </Button>

              {hasUploadedLogo ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="ml-auto"
                  disabled={isSaving || isDeleting}
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  <Trash2 className="size-4" />
                  Delete logo
                </Button>
              ) : null}
            </div>

            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_LOGO_ACCEPT}
              className="sr-only"
              onChange={handleInputChange}
            />
          </>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete the application logo?"
        description="The record and its stored image file are removed for good. Until a new logo is uploaded, the whole platform falls back to the logo bundled with the app."
        confirmLabel="Delete logo"
        isProcessing={isDeleting}
        onConfirm={handleDelete}
        onOpenChange={setConfirmDeleteOpen}
      />
    </Card>
  )
}

export { KhiLogoManager }
