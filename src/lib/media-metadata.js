// Browser-side media-metadata extractor.
//
// For each kind of file the user may pick (audio / video / image / text)
// this module returns a normalized "what the file knows about itself"
// payload that the upload form can use to pre-fill its fields.
//
// What we read:
//
//   audio (MP3/M4A/...)  Embedded ID3v2 tags (title/artist/album/year/
//                        comment) parsed in-browser without deps + the
//                        playback duration via an <audio> element.
//   video (MP4/MOV/...)  Duration + width/height via a hidden <video>
//                        element. (Embedded MP4 atoms aren't worth
//                        parsing in-browser for the marginal info we'd
//                        gain.)
//   image (JPEG/PNG/...) Natural width/height via Image() — universal
//                        across formats, no deps.
//   text  (PDF/TXT/...)  Just the file's own size + extension; PDF
//                        document metadata would need pdf.js, which is
//                        ~700KB of bundle for very little gain.
//
// All readers return `null`-or-empty values rather than throwing, so a
// flaky file (no tags, broken header, unsupported codec) just leaves
// the form fields blank instead of crashing the picker.

const TIMEOUT_MS = 8000

function withTimeout(promise, ms = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      },
    )
  })
}

// ── Audio: ID3v2 (title / artist / album / year / comment) + duration ─
//
// ID3v2 sits at the very start of an MP3 file. The header is 10 bytes;
// the tag body is "synchsafe" — every byte's high bit is forced to 0
// so the size field never collides with an MP3 sync word. Frames
// inside are 4-char ID + size + flags + body. Text frames start with a
// 1-byte encoding then the bytes; COMM frames have a language code
// and a short description before the actual comment.
//
// We read just the ID3 tag block (typically a few KB) — never the
// whole file — so even multi-hundred-MB recordings probe instantly.

const ID3_TEXT_FRAMES = {
  TIT2: 'title',
  TPE1: 'artist',
  TALB: 'album',
  TYER: 'year', // v2.3
  TDRC: 'year', // v2.4
  TCON: 'genre',
  TRCK: 'track',
}

async function readSlice(file, start, end) {
  return file.slice(start, end).arrayBuffer()
}

function decodeWithId3Encoding(bytes, encoding) {
  try {
    if (encoding === 0) return new TextDecoder('iso-8859-1').decode(bytes)
    if (encoding === 1) {
      // UTF-16 with BOM
      if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
        return new TextDecoder('utf-16le').decode(bytes.subarray(2))
      }
      if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
        return new TextDecoder('utf-16be').decode(bytes.subarray(2))
      }
      return new TextDecoder('utf-16le').decode(bytes)
    }
    if (encoding === 2) return new TextDecoder('utf-16be').decode(bytes)
    if (encoding === 3) return new TextDecoder('utf-8').decode(bytes)
    return new TextDecoder('utf-8').decode(bytes)
  } catch {
    return ''
  }
}

// Strips embedded NUL bytes (used as text terminators in ID3) without
// using a control-character regex (which ESLint's no-control-regex
// would reject). Faster than a regex anyway for this short-string use.
function stripNullsAndTrim(s) {
  if (!s) return ''
  return s.split(String.fromCharCode(0)).join('').trim()
}

function decodeId3Text(data) {
  if (!data || data.length < 1) return ''
  const enc = data[0]
  const body = data.subarray(1)
  return stripNullsAndTrim(decodeWithId3Encoding(body, enc))
}

function decodeId3Comment(data) {
  if (!data || data.length < 5) return ''
  const enc = data[0]
  // bytes 1..3 are an ISO-639 language code. Skip them.
  const rest = data.subarray(4)
  const isUtf16 = enc === 1 || enc === 2
  // Find the null terminator that separates the short description from
  // the actual comment text. UTF-16 nulls are two bytes wide.
  let descEnd = 0
  if (isUtf16) {
    while (descEnd + 1 < rest.length) {
      if (rest[descEnd] === 0 && rest[descEnd + 1] === 0) break
      descEnd += 2
    }
    const commentBytes = rest.subarray(descEnd + 2)
    return stripNullsAndTrim(decodeWithId3Encoding(commentBytes, enc))
  }
  while (descEnd < rest.length && rest[descEnd] !== 0) descEnd += 1
  const commentBytes = rest.subarray(descEnd + 1)
  return decodeWithId3Encoding(commentBytes, enc).replace(/\0+/g, '').trim()
}

async function readId3Tags(file) {
  try {
    const headerBuf = await readSlice(file, 0, 10)
    const header = new Uint8Array(headerBuf)
    // "ID3" header magic — anything else and we have no v2 tag.
    if (header[0] !== 0x49 || header[1] !== 0x44 || header[2] !== 0x33) {
      return null
    }
    const versionMajor = header[3]
    const synchsafe = (b3, b2, b1, b0) =>
      ((b3 & 0x7f) << 21) | ((b2 & 0x7f) << 14) | ((b1 & 0x7f) << 7) | (b0 & 0x7f)
    const tagSize = synchsafe(header[6], header[7], header[8], header[9])
    if (tagSize <= 0 || tagSize > 5_000_000) return null // sanity

    const bodyBuf = await readSlice(file, 10, 10 + tagSize)
    const body = new Uint8Array(bodyBuf)
    const out = {}
    let pos = 0
    while (pos + 10 <= body.length) {
      // Frame ID is four ASCII alphanumerics. The moment we see a
      // non-printable byte (typically NUL padding) the frame list is
      // over and the rest of the tag is just zero-fill.
      const b0 = body[pos]
      const b1 = body[pos + 1]
      const b2 = body[pos + 2]
      const b3 = body[pos + 3]
      if (b0 < 32 || b1 < 32 || b2 < 32 || b3 < 32) break
      const id = String.fromCharCode(b0, b1, b2, b3)
      let size
      if (versionMajor === 4) {
        size = synchsafe(body[pos + 4], body[pos + 5], body[pos + 6], body[pos + 7])
      } else {
        size =
          (body[pos + 4] << 24) |
          (body[pos + 5] << 16) |
          (body[pos + 6] << 8) |
          body[pos + 7]
      }
      if (size <= 0 || pos + 10 + size > body.length) break
      const frameData = body.subarray(pos + 10, pos + 10 + size)
      pos += 10 + size

      const textKey = ID3_TEXT_FRAMES[id]
      if (textKey) {
        const value = decodeId3Text(frameData)
        if (value && !out[textKey]) out[textKey] = value
      } else if (id === 'COMM') {
        const value = decodeId3Comment(frameData)
        if (value && !out.comment) out.comment = value
      }
    }
    // Year normalisation — TDRC may be "2010" or "2010-05-07T12:00".
    if (typeof out.year === 'string') {
      const match = out.year.match(/(\d{4})/)
      if (match) out.year = match[1]
    }
    return out
  } catch {
    return null
  }
}

async function readAudioPlayback(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()
    let done = false
    const finish = (value) => {
      if (done) return
      done = true
      URL.revokeObjectURL(url)
      resolve(value)
    }
    audio.preload = 'metadata'
    audio.addEventListener('loadedmetadata', () => {
      finish({ duration: Number.isFinite(audio.duration) ? audio.duration : null })
    })
    audio.addEventListener('error', () => finish(null))
    setTimeout(() => finish(null), TIMEOUT_MS)
    audio.src = url
  })
}

export async function extractAudioMetadata(file) {
  if (!file) return null
  const [tags, playback] = await Promise.all([
    withTimeout(readId3Tags(file), TIMEOUT_MS).catch(() => null),
    withTimeout(readAudioPlayback(file), TIMEOUT_MS).catch(() => null),
  ])
  return {
    title: tags?.title || '',
    artist: tags?.artist || '',
    album: tags?.album || '',
    year: tags?.year || '',
    comment: tags?.comment || '',
    genre: tags?.genre || '',
    duration: playback?.duration ?? null,
  }
}

// ── Video: HTML5 <video> probe (duration + dimensions) ────────────────
async function readVideoPlayback(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    let done = false
    const finish = (value) => {
      if (done) return
      done = true
      URL.revokeObjectURL(url)
      resolve(value)
    }
    video.preload = 'metadata'
    video.muted = true
    video.addEventListener('loadedmetadata', () => {
      finish({
        duration: Number.isFinite(video.duration) ? video.duration : null,
        width: video.videoWidth || null,
        height: video.videoHeight || null,
      })
    })
    video.addEventListener('error', () => finish(null))
    setTimeout(() => finish(null), TIMEOUT_MS)
    video.src = url
  })
}

export async function extractVideoMetadata(file) {
  if (!file) return null
  const playback = await withTimeout(readVideoPlayback(file), TIMEOUT_MS).catch(() => null)
  if (!playback) return null
  return {
    duration: playback.duration,
    width: playback.width,
    height: playback.height,
  }
}

// ── Image: Image() probe (natural width/height) ───────────────────────
async function readImageNatural(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    let done = false
    const finish = (value) => {
      if (done) return
      done = true
      URL.revokeObjectURL(url)
      resolve(value)
    }
    img.onload = () => finish({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => finish(null)
    setTimeout(() => finish(null), TIMEOUT_MS)
    img.src = url
  })
}

export async function extractImageMetadata(file) {
  if (!file) return null
  const dims = await withTimeout(readImageNatural(file), TIMEOUT_MS).catch(() => null)
  if (!dims) return null
  return { width: dims.width, height: dims.height }
}

// ── Text/PDF: lightweight stub ─────────────────────────────────────────
//
// Browser-side PDF metadata requires pdf.js (~700KB), and the rest of
// the supported text formats (txt, doc, docx, …) don't have widely-
// portable metadata. We'd rather have the backend extract this on
// upload than ship a heavy parser here. The function exists so the
// per-kind file-picked handlers can call it uniformly.
export async function extractTextMetadata(file) {
  if (!file) return null
  return null
}

// ── Helpers shared by the per-kind form mappers ────────────────────────
export function formatDurationSeconds(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return ''
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function yearToDateInput(year) {
  if (!year) return ''
  const y = String(year).trim().match(/(\d{4})/)
  if (!y) return ''
  return `${y[1]}-01-01`
}

export function dimensionsToString(width, height) {
  if (!width || !height) return ''
  return `${width}×${height}`
}

// ── Form-field projectors (per-kind) ──────────────────────────────────
//
// Each one takes the metadata payload from the matching extractor and
// returns a partial form-shape dictionary. Keys mirror the form state
// keys used in EmployeeProjectDetailPage / lib/<kind>-form.js so the
// merge-into-form logic in the file-picked handlers stays as simple as
// `Object.entries(...)` walk.

export function audioMetadataToForm(meta) {
  if (!meta) return {}
  const out = {}
  if (meta.title) out.originTitle = meta.title
  if (meta.artist) out.composer = meta.artist
  if (meta.comment) out.description = meta.comment
  if (meta.year) out.dateCreated = yearToDateInput(meta.year)
  // Duration and album don't have direct fields on the audio form, but
  // album makes a useful tag (so a "Sêwe" album shows up as a tag) and
  // duration makes a useful note.
  if (meta.album) out.tags = [meta.album]
  if (meta.duration) out.audioFileNote = `Duration ${formatDurationSeconds(meta.duration)}`
  if (meta.genre) out.genre = [meta.genre]
  return out
}

export function videoMetadataToForm(meta) {
  if (!meta) return {}
  const out = {}
  if (meta.duration) out.duration = formatDurationSeconds(meta.duration)
  const dim = dimensionsToString(meta.width, meta.height)
  if (dim) {
    out.dimension = dim
    out.resolution = dim
    if (meta.width && meta.height) {
      out.orientation = meta.width >= meta.height ? 'Landscape' : 'Portrait'
    }
  }
  return out
}

export function imageMetadataToForm(meta) {
  if (!meta) return {}
  const out = {}
  const dim = dimensionsToString(meta.width, meta.height)
  if (dim) {
    out.dimension = dim
    out.resolution = dim
    if (meta.width && meta.height) {
      out.orientation = meta.width >= meta.height ? 'Landscape' : 'Portrait'
    }
  }
  return out
}

export function textMetadataToForm() {
  return {}
}
