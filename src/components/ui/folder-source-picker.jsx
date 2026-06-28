import { useRef, useState } from 'react'
import { FolderOpen, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'

function getSelectedFolder(files) {
  const relativePath = String(files[0]?.webkitRelativePath || '').replace(/\\/g, '/')
  return relativePath.split('/').filter(Boolean)[0] || ''
}

/**
 * Browser fallback for selecting a source directory.
 *
 * Browsers expose the selected folder name and relative file paths, but not the
 * mounted disk name. The latter is available automatically only in a desktop
 * runtime through the native File.path property.
 */
export function FolderSourcePicker({ currentFile, onParsed }) {
  const inputRef = useRef(null)
  const [folderName, setFolderName] = useState('')

  const handleFolderChange = (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (files.length === 0) return

    const directoryName = getSelectedFolder(files)
    if (!directoryName) return

    setFolderName(directoryName)
    const externalPath = currentFile?.name ? `${directoryName}/${currentFile.name}` : ''
    onParsed?.({
      directoryName,
      externalPath,
      autoPath: externalPath,
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-3">
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        onChange={handleFolderChange}
        webkitdirectory=""
        directory=""
        multiple
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => inputRef.current?.click()}
      >
        {folderName ? <RefreshCw className="size-3.5" /> : <FolderOpen className="size-3.5" />}
        {folderName ? 'Change source folder' : 'Select source folder'}
      </Button>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-foreground">
          {folderName || 'No source folder selected'}
        </p>
        <p className="text-[11px] text-muted-foreground">
          Fills Directory and External Path in the browser.
        </p>
      </div>
    </div>
  )
}
