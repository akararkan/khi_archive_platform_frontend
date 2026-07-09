import { createElement, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Check,
  ChevronRight,
  File,
  FolderOpen,
  RefreshCw,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getFileSourcePath,
  getFileSourceRelativePath,
  getVolumeNameFromPath,
  setFileSourceFolderPath,
  setFileSourceRelativePath,
  setFileSourceVolumeName,
} from '@/lib/file-source-path'

const SOURCE_VOLUME_STORAGE_KEY = 'khi-source-volume-name'

function resolveSourceVolume(value) {
  return getVolumeNameFromPath(value) || String(value || '').trim()
}

function getRememberedSourceVolume() {
  try {
    return window.localStorage.getItem(SOURCE_VOLUME_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

function rememberSourceVolume(value) {
  try {
    if (value) window.localStorage.setItem(SOURCE_VOLUME_STORAGE_KEY, value)
    else window.localStorage.removeItem(SOURCE_VOLUME_STORAGE_KEY)
  } catch {
    // Storage may be unavailable in a private browser context.
  }
}

function defaultFileMatcher() {
  return true
}

function getRelativePath(file) {
  return String(getFileSourceRelativePath(file) || getFileSourcePath(file)?.path || file?.name || '')
    .replace(/\\/g, '/')
}

function getFolderName(files) {
  const relativePath = getRelativePath(files[0])
  return relativePath.includes('/') ? relativePath.split('/')[0] : ''
}

async function collectFilesFromDirectoryHandle(directoryHandle, rootName) {
  const files = []

  const walk = async (handle, prefix) => {
    for await (const [name, entry] of handle.entries()) {
      const relativePath = prefix ? `${prefix}/${name}` : name
      if (entry.kind === 'file') {
        const file = await entry.getFile()
        setFileSourceRelativePath(file, relativePath)
        files.push(file)
        continue
      }

      if (entry.kind === 'directory') {
        await walk(entry, relativePath)
      }
    }
  }

  await walk(directoryHandle, rootName)
  return files
}

/**
 * Two-stage media picker shared by audio, video, image, and text forms.
 *
 * The user first grants access to one folder. The browser then supplies a
 * relative path for every File in that folder, so the user can choose exactly
 * one compatible file while the form keeps its source-folder information.
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
  const [folderFiles, setFolderFiles] = useState([])
  const [folderName, setFolderName] = useState('')
  const [sourceVolumeInput, setSourceVolumeInput] = useState(getRememberedSourceVolume)
  const [error, setError] = useState('')

  const setFolderSelection = (files, folderLabel) => {
    const compatibleFiles = files.filter(isAcceptedFile)
    if (compatibleFiles.length === 0) {
      setFolderFiles([])
      setFolderName(folderLabel || getFolderName(files))
      setError(`This folder does not contain a supported ${mediaLabel} file.`)
      return false
    }

    const nextFolderName = folderLabel || getFolderName(files)
    setFolderFiles(compatibleFiles)
    setFolderName(nextFolderName)
    if (nextFolderName) {
      setSourceVolumeInput(nextFolderName)
      rememberSourceVolume(nextFolderName)
    }
    onFileChange(null)
    return true
  }

  const sortedFiles = useMemo(
    () =>
      [...folderFiles].sort((left, right) =>
        getRelativePath(left).localeCompare(getRelativePath(right), undefined, {
          numeric: true,
          sensitivity: 'base',
        }),
      ),
    [folderFiles],
  )

  const clearInput = () => {
    if (inputRef.current) inputRef.current.value = ''
  }

  const clearEverything = () => {
    setError('')
    setFolderFiles([])
    setFolderName('')
    onFileChange(null)
    clearInput()
  }

  const returnToFolder = () => {
    setError('')
    onFileChange(null)
  }

  const handleFolderPicked = (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    setError('')

    if (files.length === 0) return

    setFolderSelection(files, getFolderName(files))
  }

  const openFolderPicker = async () => {
    setError('')

    if (typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function') {
      try {
        const directoryHandle = await window.showDirectoryPicker({ mode: 'read' })
        const files = await collectFilesFromDirectoryHandle(directoryHandle, directoryHandle.name)
        if (files.length === 0) return
        setFolderSelection(files, directoryHandle.name)
        return
      } catch {
        return
      }
    }

    inputRef.current?.click()
  }

  const chooseFile = (picked) => {
    if (!picked || !isAcceptedFile(picked)) return
    setError('')
    const volumeName = resolveSourceVolume(sourceVolumeInput || folderName)
    setFileSourceFolderPath(picked, sourceVolumeInput)
    setFileSourceRelativePath(picked, getRelativePath(picked))
    setFileSourceVolumeName(picked, volumeName)
    rememberSourceVolume(volumeName)
    // Only this one File is passed to form state and the upload service.
    onFileChange(picked)
  }

  const sourceVolumeName = resolveSourceVolume(sourceVolumeInput)

  const updateSelectedFileSourceVolume = (value) => {
    setSourceVolumeInput(value)
    const volumeName = resolveSourceVolume(value)
    if (!file || !volumeName) return

    setFileSourceFolderPath(file, value)
    setFileSourceRelativePath(file, getRelativePath(file))
    setFileSourceVolumeName(file, volumeName)
    rememberSourceVolume(volumeName)
    // Re-run the owning form's auto-fill now that the browser-hidden volume
    // name is available. This shared picker covers every media form.
    onFileChange(file)
  }

  if (file) {
    const source = getFileSourcePath(file)
    return (
      <div className="overflow-hidden rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04]">
        <div className="flex items-center gap-3 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
            {createElement(FileIcon, { className: 'size-5' })}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5">
              <Check className="size-3.5 shrink-0 text-emerald-600" />
              <p className="truncate text-sm font-semibold text-foreground">{file.name}</p>
            </div>
            {source.path ? (
              <p
                className="truncate font-mono text-[11px] text-muted-foreground"
                title={source.path}
              >
                {source.path}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              One file selected
              {source.path ? ' · folder and external path filled below' : ''}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={clearEverything}
            aria-label="Clear the selected folder and file"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-1.5 border-t border-emerald-500/15 bg-background/50 px-4 py-3.5">
          <label
            htmlFor={`${id}-selected-source-volume`}
            className="text-xs font-semibold text-foreground"
          >
            Source volume / device
          </label>
          <Input
            id={`${id}-selected-source-volume`}
            value={sourceVolumeInput}
            onChange={(event) => updateSelectedFileSourceVolume(event.target.value)}
            placeholder="e.g. Hard1"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-[11px] text-muted-foreground">
            {source.volumeName ? (
              <>
                Volume filled as{' '}
                <span className="font-semibold text-foreground">{source.volumeName}</span>.
              </>
            ) : (
              'Enter the device name once; it is remembered for every media type.'
            )}
          </p>
        </div>

        {folderFiles.length > 0 ? (
          <div className="flex items-center justify-end border-t border-emerald-500/15 bg-background/50 px-4 py-2.5">
            <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={returnToFolder}>
              <RefreshCw className="size-3.5" />
              Choose another file from this folder
            </Button>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {folderFiles.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-3 border-b border-border bg-muted/25 px-4 py-3.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-background text-primary shadow-sm ring-1 ring-border">
              <FolderOpen className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {folderName || 'Selected folder'}
              </p>
              <p className="text-xs text-muted-foreground">
                {sortedFiles.length} supported {sortedFiles.length === 1 ? 'file' : 'files'} · choose
                one
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={openFolderPicker}
            >
              <RefreshCw className="size-3.5" />
              Change folder
            </Button>
          </div>

          <div className="space-y-1.5 border-b border-border px-4 py-3.5">
            <label
              htmlFor={`${id}-source-volume`}
              className="text-xs font-semibold text-foreground"
            >
              Source volume / device
            </label>
            <Input
              id={`${id}-source-volume`}
              value={sourceVolumeInput}
              onChange={(event) => setSourceVolumeInput(event.target.value)}
              placeholder="e.g. Hard1"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-[11px] text-muted-foreground">
              {sourceVolumeName ? (
                <>
                  Volume will be filled as{' '}
                  <span className="font-semibold text-foreground">{sourceVolumeName}</span>.
                </>
              ) : (
                'Enter the device name once; it will be remembered for audio, video, image, and text.'
              )}
            </p>
          </div>

          <div className="max-h-72 divide-y divide-border overflow-y-auto p-1.5">
            {sortedFiles.map((candidate, index) => {
              const relativePath = getRelativePath(candidate)
              const pathWithoutRoot = relativePath.split('/').slice(1).join('/') || candidate.name

              return (
                <button
                  key={`${relativePath}-${candidate.size}-${candidate.lastModified}-${index}`}
                  type="button"
                  className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => chooseFile(candidate)}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                    <File className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {candidate.name}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">
                      {pathWithoutRoot}
                    </span>
                  </span>
                  <span className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <ChevronRight className="size-4" />
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/20 px-5 py-9 text-center transition-colors hover:border-primary/50 hover:bg-primary/[0.03]"
          onClick={openFolderPicker}
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-background text-primary shadow-sm ring-1 ring-border">
            <FolderOpen className="size-5.5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {isEdit ? `Choose a folder for the replacement ${mediaLabel}` : 'Choose source folder'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Then choose exactly one {mediaLabel} file from that folder
            </p>
            {acceptedFormats ? (
              <p className="mt-1.5 text-[11px] text-muted-foreground">{acceptedFormats}</p>
            ) : null}
          </div>
        </button>
      )}

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/[0.06] p-3.5 text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">No compatible file found</p>
            <p className="mt-0.5 text-xs text-destructive/80">{error}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
            onClick={() => inputRef.current?.click()}
          >
            Try another
          </Button>
        </div>
      ) : null}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        onChange={handleFolderPicked}
        className="sr-only"
        webkitdirectory=""
        directory=""
      />
    </div>
  )
}
