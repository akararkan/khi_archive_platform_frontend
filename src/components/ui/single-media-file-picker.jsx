import { createElement, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getFileSourcePath } from '@/lib/file-source-path'

function defaultFileMatcher() {
  return true
}

/**
 * A true single-file picker. The operating-system dialog lets the user browse
 * into an album/folder and select the exact track or media file they want.
 */
export function SingleMediaFilePicker({
  id,
  file,
  onFileChange,
  mediaLabel,
  acceptedFormats,
  accept,
  isEdit = false,
  icon: FileIcon,
  isAcceptedFile = defaultFileMatcher,
}) {
  const inputRef = useRef(null)
  const [error, setError] = useState('')

  const clearSelection = () => {
    setError('')
    onFileChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleFilePicked = (event) => {
    const picked = event.target.files?.[0] || null
    event.target.value = ''
    setError('')

    if (!picked) return
    if (!isAcceptedFile(picked)) {
      setError(`That file is not a supported ${mediaLabel} file.`)
      return
    }

    // Exactly one File is passed to form state and the upload service.
    onFileChange(picked)
  }

  if (file) {
    const source = getFileSourcePath(file)
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-background text-muted-foreground shadow-sm ring-1 ring-border">
          {createElement(FileIcon, { className: 'size-4.5' })}
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate text-sm font-semibold text-foreground">{file.name}</p>
          {source.path ? (
            <p
              className="truncate font-mono text-[11px] text-muted-foreground"
              title={source.path}
            >
              {source.path}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {source.path
              ? 'One file selected · available folder information was auto-filled below'
              : 'One file selected · your browser protected the parent-folder location'}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon-xs" onClick={clearSelection}>
          <X className="size-3.5" />
          <span className="sr-only">Remove selected file</span>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      <label
        htmlFor={id}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/40"
      >
        <span className="grid size-10 place-items-center rounded-xl bg-background text-muted-foreground shadow-sm ring-1 ring-border">
          <Upload className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {isEdit ? `Choose one replacement ${mediaLabel} file` : `Choose one ${mediaLabel} file`}
          </p>
          <p className="text-xs text-muted-foreground">
            Open any album or folder and select the exact file you need
          </p>
          {acceptedFormats ? (
            <p className="mt-1 text-[11px] text-muted-foreground">{acceptedFormats}</p>
          ) : null}
        </div>
      </label>

      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        onChange={handleFilePicked}
        className="sr-only"
      />
    </div>
  )
}
