import { createElement, useRef, useState } from 'react'
import { FolderOpen, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getFileSourcePath } from '@/lib/file-source-path'

function defaultFileMatcher() {
  return true
}

function formatFileSize(bytes) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(2)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

/**
 * Folder-first, single-file picker.
 *
 * The browser receives relative paths only when the user grants access to a
 * folder. We enumerate supported files from that folder, then pass exactly one
 * chosen File to the form and upload service.
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
  const [candidates, setCandidates] = useState([])
  const [error, setError] = useState('')

  const clearSelection = () => {
    setCandidates([])
    setError('')
    onFileChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleFolderPicked = (event) => {
    const matchingFiles = Array.from(event.target.files || [])
      .filter(isAcceptedFile)
      .sort((a, b) =>
        (a.webkitRelativePath || a.name).localeCompare(
          b.webkitRelativePath || b.name,
          undefined,
          { numeric: true, sensitivity: 'base' },
        ),
      )

    event.target.value = ''
    setError('')

    if (matchingFiles.length === 0) {
      setCandidates([])
      setError(`No supported ${mediaLabel} files were found in that folder.`)
      return
    }

    if (matchingFiles.length === 1) {
      setCandidates([])
      onFileChange(matchingFiles[0])
      return
    }

    setCandidates(matchingFiles)
  }

  const chooseCandidate = (candidate) => {
    setCandidates([])
    setError('')
    onFileChange(candidate)
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
            One file selected · parent directory and relative external path captured
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
    <div className="space-y-3">
      {candidates.length > 0 ? (
        <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Choose one {mediaLabel} file
              </p>
              <p className="text-xs text-muted-foreground">
                {candidates.length} supported files found · only your chosen file will be uploaded
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCandidates([])}
              className="text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              Choose another folder
            </button>
          </div>
          <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {candidates.map((candidate) => (
              <li key={candidate.webkitRelativePath || candidate.name}>
                <button
                  type="button"
                  onClick={() => chooseCandidate(candidate)}
                  className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2 text-left transition hover:border-primary/35 hover:bg-primary/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  {createElement(FileIcon, {
                    className: 'size-4 shrink-0 text-muted-foreground',
                  })}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-foreground">
                      {candidate.name}
                    </span>
                    <span className="block truncate font-mono text-[10px] text-muted-foreground">
                      {candidate.webkitRelativePath || candidate.name}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                    {formatFileSize(candidate.size)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <label
          htmlFor={id}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/40"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-background text-muted-foreground shadow-sm ring-1 ring-border">
            <FolderOpen className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {isEdit ? 'Choose the replacement file’s folder' : `Choose the ${mediaLabel} folder`}
            </p>
            <p className="text-xs text-muted-foreground">
              Select the album/source folder, then choose one exact file
            </p>
            {acceptedFormats ? (
              <p className="mt-1 text-[11px] text-muted-foreground">{acceptedFormats}</p>
            ) : null}
          </div>
        </label>
      )}

      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        multiple
        webkitdirectory=""
        directory=""
        onChange={handleFolderPicked}
        className="sr-only"
      />
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        The browser captures paths inside the selected folder, but may hide the source device or storage name.
        Auto Path remains your manually entered cloud/archive URL.
      </p>
    </div>
  )
}
