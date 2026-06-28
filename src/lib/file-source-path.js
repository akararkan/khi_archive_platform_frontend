function normalizePath(value) {
  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
}

const sourceFolderPaths = new WeakMap()
const sourceVolumeNames = new WeakMap()

/**
 * Extract the storage/device name from an absolute source path.
 *
 * Finder paths for external disks have the shape
 * `/Volumes/{device}/...`, so `/Volumes/Hard1/audio` becomes `Hard1`.
 */
export function getVolumeNameFromPath(value) {
  const raw = String(value || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\/g, '/')

  const macVolume = raw.match(/^\/Volumes\/([^/]+)(?:\/|$)/i)
  if (macVolume) return macVolume[1]

  const windowsDrive = raw.match(/^([A-Za-z]:)(?:\/|$)/)
  if (windowsDrive) return windowsDrive[1]

  const linuxVolume = raw.match(/^\/(?:run\/)?media\/[^/]+\/([^/]+)(?:\/|$)/i)
  if (linuxVolume) return linuxVolume[1]

  const mountedVolume = raw.match(/^\/mnt\/([^/]+)(?:\/|$)/i)
  return mountedVolume?.[1] || ''
}

/**
 * Browsers intentionally remove the absolute disk path from selected Files.
 * Keep a user-supplied source folder path beside the File without modifying
 * the File object that is later uploaded.
 */
export function setFileSourceFolderPath(file, value) {
  if (!file || (typeof file !== 'object' && typeof file !== 'function')) return

  const path = String(value || '').trim()
  if (path) sourceFolderPaths.set(file, path)
  else sourceFolderPaths.delete(file)
}

export function setFileSourceVolumeName(file, value) {
  if (!file || (typeof file !== 'object' && typeof file !== 'function')) return

  const volumeName = String(value || '').trim()
  if (volumeName) sourceVolumeNames.set(file, volumeName)
  else sourceVolumeNames.delete(file)
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
      volumeName: getVolumeNameFromPath(raw),
      directory: parts.slice(1).join('/'),
    }
  }

  // macOS external volumes use /Volumes/{volume}/... .
  if (parts[0] === 'Volumes' && parts.length >= 2) {
    return {
      path: raw,
      volumeName: getVolumeNameFromPath(raw),
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
  const relativePath = normalizePath(file?.webkitRelativePath)
  const parts = relativePath.split('/').filter(Boolean)
  const suppliedVolumeName =
    sourceVolumeNames.get(file) || getVolumeNameFromPath(sourceFolderPaths.get(file))

  if (parts.length < 2) {
    if (native) return native

    return {
      path: '',
      volumeName: suppliedVolumeName,
      directory: '',
    }
  }

  return {
    path: parts.join('/'),
    // Prefer a native path when the runtime exposes it. In a normal browser,
    // use the full Finder path supplied in the folder picker.
    volumeName: native?.volumeName || suppliedVolumeName,
    directory: parts[parts.length - 2] || '',
  }
}
