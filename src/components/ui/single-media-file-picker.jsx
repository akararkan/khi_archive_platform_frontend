import { createElement, useRef, useState } from 'react'
import { FolderOpen, X } from 'lucide-react'

import { Button } from '@/components/ui/button'

function defaultFileMatcher() {
  return true
}

/**
 * Browser-safe source-path picker.
 *
 * Browsers do not expose an absolute path from a normal single-file picker.
 * A directory picker is therefore used to capture `webkitRelativePath`, after
 * which this component lets the user attach exactly one matching file.
 */
export function SingleMediaFilePicker({
  id,
  file,
  onFileChange,
  mediaLabel,
  acceptedFormats,
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
      setError(`No ${mediaLabel} files were found in that folder.`)
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
    const sourcePath = file.webkitRelativePath || file.name
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
        {createElement(FileIcon, { className: 'size-5 shrink-0 text-muted-foreground' })}
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p
            className="truncate font-mono text-[11px] text-muted-foreground"
            title={sourcePath}
          >
            {sourcePath}
          </p>
          <p className="text-xs text-muted-foreground">
            One file selected · volume, directory tree, and source path auto-filled below
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
        <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-foreground">
                Choose one {mediaLabel} file
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Only the file you choose here will be attached.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCandidates([])}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
          <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {candidates.map((candidate) => (
              <li key={candidate.webkitRelativePath || candidate.name}>
                <button
                  type="button"
                  onClick={() => chooseCandidate(candidate)}
                  className="flex w-full items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-left text-xs transition hover:border-primary/40 hover:bg-muted/40"
                >
                  {createElement(FileIcon, {
                    className: 'size-3.5 shrink-0 text-muted-foreground',
                  })}
                  <span className="min-w-0 flex-1 truncate font-mono">
                    {candidate.webkitRelativePath || candidate.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <label
          htmlFor={id}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-7 text-center transition-colors hover:border-primary/50 hover:bg-muted/40"
        >
          <FolderOpen className="size-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {isEdit ? 'Replace with one file and capture its path' : 'Choose one file and capture its path'}
            </p>
            <p className="text-xs text-muted-foreground">
              First choose the drive or highest folder, then choose one {mediaLabel} file
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
        // `multiple` is required for directory enumeration. The component never
        // passes more than one File to the form or upload service.
        multiple
        webkitdirectory=""
        directory=""
        onChange={handleFolderPicked}
        className="sr-only"
      />
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        For privacy, browsers cannot reveal folders above the drive or folder you choose.
        Select the volume itself when you need its name at the start of the saved path.
      </p>
    </div>
  )
}
