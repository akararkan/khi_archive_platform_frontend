function normalizePath(value) {
  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
}

/**
 * Return the fullest source location a web browser is allowed to expose.
 *
 * A normal single-file input intentionally hides the disk path. Files returned
 * by a directory input include `webkitRelativePath`, starting with the folder
 * (or volume) selected by the user.
 */
export function getFileSourcePath(file) {
  const relativePath = normalizePath(file?.webkitRelativePath)
  const parts = relativePath.split('/').filter(Boolean)

  if (parts.length < 2) {
    return {
      path: '',
      volumeName: '',
      directory: '',
    }
  }

  return {
    path: parts.join('/'),
    volumeName: parts[0],
    // Keep the complete nested directory tree, not only the immediate parent.
    directory: parts.slice(1, -1).join('/'),
  }
}
