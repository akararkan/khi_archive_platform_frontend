// Inline reader for every non-PDF book/document format we can render in the
// browser: plain text, Markdown, LaTeX/XML/JSON source, CSV/TSV tables, HTML,
// and .docx (via mammoth). PDF keeps its dedicated pdf.js viewers; this fills
// the gap that previously showed "Preview is not available for this file type".
//
// `variant="khi"` renders inside the public RTL archive reader (parchment card +
// anti-capture wrapper); `variant="plain"` renders the neutral dashboard modal
// treatment. Both share one fetch/parse/render path.
import { useEffect, useMemo, useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'

import { apiClient } from '@/lib/api-client'
import { resolveMediaUrl } from '@/lib/media-url'
import {
  resolveDocKind, resolveExtension, decodeBufferToText, parseDelimited,
  sanitizeDocumentHtml, convertDocxToHtml, stripRtf, TEXT_CHAR_CAP,
} from '@/lib/document-preview'

function stopProtectedMediaEvent(event) {
  event.preventDefault()
  event.stopPropagation()
}

function humanizeError(err, kind) {
  if (err?.response?.status === 404) return 'This file could not be found.'
  if (kind === 'docx') return 'This Word document could not be rendered.'
  return 'Could not load the document preview.'
}

function DocumentContentReader({ fileUrl, extension, fileName, title, variant = 'khi' }) {
  const ext = useMemo(() => resolveExtension(extension, fileName, fileUrl), [extension, fileName, fileUrl])
  const kind = useMemo(() => resolveDocKind(extension, fileName, fileUrl), [extension, fileName, fileUrl])
  const [state, setState] = useState({ status: 'idle', data: null, error: '' })

  useEffect(() => {
    if (!fileUrl || kind === 'unsupported' || kind === 'pdf') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: 'idle', data: null, error: '' })
      return undefined
    }

    let cancelled = false
    const ctrl = new AbortController()
    setState({ status: 'loading', data: null, error: '' })

    async function run() {
      try {
        const res = await apiClient.get(resolveMediaUrl(fileUrl), {
          responseType: 'arraybuffer',
          signal: ctrl.signal,
          // Archival scans/books can be large; the default 15s client timeout
          // would cut a slow download off mid-stream.
          timeout: 0,
          // Ask the stream endpoint for the whole file in one response (some
          // media endpoints otherwise chunk a no-Range request to a small
          // window — see use-authed-media-url.js).
          headers: { Range: 'bytes=0-' },
        })
        if (cancelled) return

        const buffer = res.data
        let data
        if (kind === 'docx') {
          data = { html: await convertDocxToHtml(buffer) }
        } else if (kind === 'html') {
          data = { html: sanitizeDocumentHtml(decodeBufferToText(buffer)) }
        } else if (kind === 'table') {
          const rows = parseDelimited(decodeBufferToText(buffer), ext === 'tsv' ? '\t' : ',')
          data = { rows }
        } else {
          let text = decodeBufferToText(buffer)
          if (kind === 'text') text = stripRtf(text)
          const truncated = text.length > TEXT_CHAR_CAP
          data = { text: truncated ? text.slice(0, TEXT_CHAR_CAP) : text, truncated }
        }

        if (!cancelled) setState({ status: 'ready', data, error: '' })
      } catch (err) {
        if (cancelled || err?.code === 'ERR_CANCELED' || err?.name === 'AbortError') return
        setState({ status: 'error', data: null, error: humanizeError(err, kind) })
      }
    }

    run()
    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [fileUrl, kind, ext])

  let inner
  if (!fileUrl) {
    inner = <div className="doc-reader-status">No file is attached to this record.</div>
  } else if (kind === 'unsupported') {
    inner = (
      <div className="doc-reader-status">
        <FileText aria-hidden="true" className="doc-reader-status-icon" />
        <p>Inline preview isn&apos;t available for {ext ? `.${ext}` : 'this'} files yet.</p>
        {fileName ? <p className="doc-reader-status-sub">{fileName}</p> : null}
      </div>
    )
  } else if (state.status === 'loading' || state.status === 'idle') {
    inner = (
      <div className="doc-reader-status">
        <Loader2 aria-hidden="true" className="doc-reader-status-icon doc-reader-spin" />
        <p>Loading document…</p>
      </div>
    )
  } else if (state.status === 'error') {
    inner = <div className="doc-reader-status doc-reader-status--error">{state.error}</div>
  } else if (kind === 'html' || kind === 'docx') {
    // state.data.html is DOMPurify-sanitized in document-preview.js.
    inner = <div className="doc-reader-html" dir="auto" dangerouslySetInnerHTML={{ __html: state.data.html }} />
  } else if (kind === 'table') {
    inner = <DelimitedTable rows={state.data.rows} />
  } else if (kind === 'code') {
    inner = <pre className="doc-reader-code" dir="ltr">{state.data.text}</pre>
  } else {
    inner = (
      <div className="doc-reader-prose" dir="auto">
        {state.data.text}
        {state.data.truncated ? (
          <p className="doc-reader-note">Preview truncated — this document is very long.</p>
        ) : null}
      </div>
    )
  }

  if (variant === 'khi') {
    return (
      <div
        className="protected-file-viewer protected-media"
        onAuxClick={stopProtectedMediaEvent}
        onContextMenu={stopProtectedMediaEvent}
      >
        <div className="doc-reader doc-reader--khi" aria-label={title ? `${title} preview` : 'Document preview'}>
          {inner}
        </div>
      </div>
    )
  }

  return <div className="doc-reader doc-reader--plain">{inner}</div>
}

function DelimitedTable({ rows }) {
  if (!rows?.length) {
    return <div className="doc-reader-status">This spreadsheet appears to be empty.</div>
  }
  const [header, ...body] = rows
  const columns = rows.reduce((max, r) => Math.max(max, r.length), 0)
  const cells = (row) => Array.from({ length: columns }, (_, i) => row[i] ?? '')
  return (
    <div className="doc-reader-table-wrap">
      <table className="doc-reader-table" dir="auto">
        <thead>
          <tr>{cells(header).map((c, i) => <th key={`h-${i}`}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((row, r) => (
            <tr key={`r-${r}`}>{cells(row).map((c, i) => <td key={`c-${r}-${i}`}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export { DocumentContentReader }
