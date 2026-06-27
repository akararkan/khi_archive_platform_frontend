function normalizePath(value) {
  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
}

function parseNativePath(value) {
  const raw = String(value || '').replace(/\\/g, '/')
  if (!raw) return null

  const isWindows = /^[A-Za-z]:\//.test(raw)
  const isAbsolute = isWindows || raw.startsWith('/')
  if (!isAbsolute) return null

  const parts = raw.split('/').filter(Boolean)
  const fileName = parts.pop()
  if (!fileName) return null

  if (isWindows) {
    return {
      path: raw,
      volumeName: parts[0] || '',
      directory: parts.slice(1).join('/'),
    }
  }

  // macOS external volumes use /Volumes/{volume}/... .
  if (parts[0] === 'Volumes' && parts.length >= 2) {
    return {
      path: raw,
      volumeName: parts[1],
      directory: parts.slice(2).join('/'),
    }
  }

  return {
    path: raw,
    volumeName: '',
    directory: `/${parts.join('/')}`,
  }
}

/**
 * Return the fullest source location the current runtime exposes.
 *
 * Standard browsers expose only `File.name`, never its parent path. Desktop
 * shells may additionally expose `path`; directory-originated Files may expose
 * `webkitRelativePath`. Both are supported without fabricating information.
 */
export function getFileSourcePath(file) {
  const native = parseNativePath(file?.path || file?.fullPath)
  if (native) return native

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
