// Client-side document/book preview helpers.
//
// The text ("book") entity accepts many upload formats (see the accept list on
// the text upload/edit forms), but historically only PDF had a renderer — every
// other format fell through to a "Preview is not available for this file type"
// message. There is no backend convert-to-preview endpoint; `textFileUrl` serves
// the raw file, so any preview has to be produced in the browser.
//
// This module classifies a file by its stored `extension` field (the reliable
// signal — the `/stream` URL usually carries no real extension) and provides the
// small parse/convert steps each renderable kind needs. `DocumentContentReader`
// consumes these; the PDF path keeps its dedicated pdf.js viewers unchanged.

import DOMPurify from 'dompurify'

// Rendered as flowing prose (white-space preserved, direction auto-detected).
const TEXT_EXTS = ['txt', 'text', 'md', 'markdown', 'log', 'rtf']
// Rendered as monospace source — data/markup where structure matters.
const CODE_EXTS = ['tex', 'xml', 'json', 'yaml', 'yml']
// Delimiter-separated → rendered as a table.
const TABLE_EXTS = ['csv', 'tsv']
// Fetched as text and rendered as sanitized HTML.
const HTML_EXTS = ['html', 'htm']
// Binary Office XML → converted to sanitized HTML via mammoth.
const DOCX_EXTS = ['docx']
const PDF_EXTS = ['pdf']

// Everything we can render without a backend converter. `rtf` is included as a
// best-effort plain-text fallback (raw control words are stripped lightly).
const RENDERABLE = new Set([
  ...PDF_EXTS, ...TEXT_EXTS, ...CODE_EXTS, ...TABLE_EXTS, ...HTML_EXTS, ...DOCX_EXTS,
])

/**
 * Lower-cased extension (no dot) resolved from the stored field first, then the
 * file name, then the URL path as a last resort.
 */
export function resolveExtension(extension, fileName, fileUrl) {
  const fromField = String(extension || '').trim().toLowerCase().replace(/^\./, '')
  if (fromField) return fromField
  const fromName = extFromString(fileName)
  if (fromName) return fromName
  // The URL is usually a `/stream` endpoint, but legacy rows may still hold a
  // real file path — strip the query/hash before probing.
  return extFromString(String(fileUrl || '').split(/[?#]/)[0])
}

function extFromString(value) {
  const name = String(value || '').trim()
  const dot = name.lastIndexOf('.')
  if (dot < 0 || dot === name.length - 1) return ''
  return name.slice(dot + 1).toLowerCase()
}

/**
 * Classify a file into a render strategy.
 * @returns {'pdf'|'text'|'code'|'table'|'html'|'docx'|'unsupported'}
 */
export function resolveDocKind(extension, fileName, fileUrl) {
  const ext = resolveExtension(extension, fileName, fileUrl)
  if (PDF_EXTS.includes(ext)) return 'pdf'
  if (DOCX_EXTS.includes(ext)) return 'docx'
  if (HTML_EXTS.includes(ext)) return 'html'
  if (TABLE_EXTS.includes(ext)) return 'table'
  if (CODE_EXTS.includes(ext)) return 'code'
  if (TEXT_EXTS.includes(ext)) return 'text'
  return 'unsupported'
}

/** True when the file can be previewed inline (any kind other than unsupported). */
export function isPreviewable(extension, fileName, fileUrl) {
  return RENDERABLE.has(resolveExtension(extension, fileName, fileUrl))
}

/**
 * Decode raw bytes to a string, honouring a leading BOM (UTF-8 / UTF-16). Falls
 * back to UTF-8; archival Kurdish/Arabic text is overwhelmingly UTF-8.
 */
export function decodeBufferToText(buffer) {
  const bytes = new Uint8Array(buffer)
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3))
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2))
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2))
  }
  return new TextDecoder('utf-8').decode(bytes)
}

// A single decoded document beyond this many characters is truncated before
// render so a pathological upload can't freeze the tab. ~2M chars ≈ a very long
// book; the reader shows a note when this trips.
export const TEXT_CHAR_CAP = 2_000_000

/** Lightly strip RTF control words so a .rtf falls back to readable-ish text. */
export function stripRtf(text) {
  if (!/^\s*{\\rtf/i.test(text)) return text
  return text
    .replace(/\\'[0-9a-fA-F]{2}/g, '')
    .replace(/\\[a-zA-Z]+-?\d* ?/g, '')
    .replace(/[{}]/g, '')
    .replace(/\r?\n\s*\r?\n/g, '\n\n')
    .trim()
}

/**
 * Parse delimiter-separated text into an array of rows (array of cells),
 * handling quoted fields, escaped quotes (""), and CRLF. `tab` picks TSV.
 */
export function parseDelimited(text, delimiter = ',') {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1 }
        else quoted = false
      } else field += ch
      continue
    }
    if (ch === '"') { quoted = true; continue }
    if (ch === delimiter) { row.push(field); field = ''; continue }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue }
    if (ch === '\r') continue
    field += ch
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows.filter((r) => r.length > 1 || (r[0] && r[0].length))
}

/**
 * Sanitize untrusted HTML (from a .html upload or mammoth's .docx output) for
 * safe rendering. Strips scripts/handlers; forces external links to open in a
 * new, isolated tab.
 */
export function sanitizeDocumentHtml(dirty) {
  const clean = DOMPurify.sanitize(String(dirty || ''), {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['style'],
  })
  return clean
}

/**
 * Convert a .docx ArrayBuffer to sanitized HTML. Throws on a non-docx buffer.
 * mammoth (~500 kB) is imported lazily so it stays out of the main bundle and
 * only loads when a Word document is actually previewed.
 */
export async function convertDocxToHtml(arrayBuffer) {
  const { default: mammoth } = await import('mammoth')
  const { value } = await mammoth.convertToHtml({ arrayBuffer })
  return sanitizeDocumentHtml(value)
}
