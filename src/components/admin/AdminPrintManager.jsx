import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, FileText, Printer } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const PAPER_FORMATS = [
  { value: 'A4 portrait', label: 'A4 · Portrait' },
  { value: 'A4 landscape', label: 'A4 · Landscape' },
  { value: 'Letter portrait', label: 'Letter · Portrait' },
  { value: 'Letter landscape', label: 'Letter · Landscape' },
  { value: 'Legal portrait', label: 'Legal · Portrait' },
  { value: 'Legal landscape', label: 'Legal · Landscape' },
  { value: 'A3 portrait', label: 'A3 · Portrait' },
  { value: 'A3 landscape', label: 'A3 · Landscape' },
]

const PAPER_SIZE_STORAGE_KEY = 'khi-admin-print-paper-format'

const PRINTABLE_ADMIN_PATHS = [
  '/admin/category',
  '/admin/person',
  '/admin/project',
  '/admin/items',
  '/admin/maqam',
  '/admin/physical-media',
  '/admin/trash',
  '/admin/analytics',
  '/admin/users',
  '/admin/warnings',
  '/admin/corrections',
]

const PAGE_TITLES = {
  '/admin/category': 'Categories',
  '/admin/person': 'Persons',
  '/admin/project': 'Projects',
  '/admin/items': 'List of Items',
  '/admin/maqam': 'Maqam List',
  '/admin/physical-media': 'Physical Media',
  '/admin/trash': 'Trash',
  '/admin/analytics': 'Analytics',
  '/admin/users': 'Users',
  '/admin/warnings': 'Warnings',
  '/admin/corrections': 'Corrections',
}

const NON_REPORT_SELECTOR = [
  '[data-admin-print-toolbar]',
  '[data-admin-print-record]',
  '[data-no-print]',
  '[role="dialog"]',
  'button',
  'input',
  'select',
  'textarea',
  '[data-slot="pagination"]',
].join(',')

function isPrintablePath(pathname) {
  return PRINTABLE_ADMIN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
}

function titleForPath(pathname, root) {
  const pageHeading = root?.querySelector('h1')?.textContent?.trim()
  if (pageHeading) return pageHeading

  const match = Object.entries(PAGE_TITLES).find(
    ([path]) => pathname === path || pathname.startsWith(`${path}/`),
  )
  return match?.[1] || 'Archive Report'
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function isDataRow(row) {
  const text = row?.textContent?.replace(/\s+/g, ' ').trim()
  return Boolean(
    text &&
      row.cells?.length >= 2 &&
      !row.querySelector('[data-slot="skeleton"]') &&
      !row.querySelector('[role="status"]'),
  )
}

function removeNonReportContent(node) {
  node.querySelectorAll(NON_REPORT_SELECTOR).forEach((element) => element.remove())
  node.querySelectorAll('[aria-hidden="true"], svg').forEach((element) => element.remove())
}

function removeActionColumns(table) {
  const firstHeaderRow = table.tHead?.rows?.[0]
  if (!firstHeaderRow) return

  const actionIndexes = [...firstHeaderRow.cells]
    .map((cell, index) => ({ index, label: cell.textContent?.trim().toLowerCase() }))
    .filter(({ label }) => label === 'actions' || label === 'action')
    .map(({ index }) => index)
    .reverse()

  if (!actionIndexes.length) return

  ;[...table.rows].forEach((row) => {
    actionIndexes.forEach((index) => row.cells[index]?.remove())
  })
}

function prepareTable(sourceTable) {
  const table = sourceTable.cloneNode(true)
  removeNonReportContent(table)
  removeActionColumns(table)
  table.querySelectorAll('[class], [style]').forEach((element) => {
    element.removeAttribute('class')
    element.removeAttribute('style')
  })
  return table
}

function tableSectionTitle(table, fallback, index, total) {
  const cardTitle = table
    .closest('[data-slot="card"]')
    ?.querySelector('[data-slot="card-title"], h2, h3')
    ?.textContent?.trim()
  if (cardTitle) return cardTitle
  return total > 1 ? `${fallback} · Section ${index + 1}` : `${fallback} records`
}

function buildAllRecordsContent(root, title) {
  const sourceTables = [...root.querySelectorAll('table')].filter((table) =>
    [...table.tBodies].some((body) => [...body.rows].some(isDataRow)),
  )

  if (sourceTables.length) {
    let totalRows = 0
    const sections = sourceTables.map((sourceTable, index) => {
      const rowCount = [...sourceTable.tBodies].reduce(
        (count, body) => count + [...body.rows].filter(isDataRow).length,
        0,
      )
      totalRows += rowCount
      const table = prepareTable(sourceTable)
      const sectionTitle = tableSectionTitle(sourceTable, title, index, sourceTables.length)

      return `
        <section class="report-section">
          <div class="section-heading">
            <div>
              <span class="section-kicker">ARCHIVE DATA</span>
              <h2>${escapeHtml(sectionTitle)}</h2>
            </div>
            <span class="section-count">${rowCount.toLocaleString()} records</span>
          </div>
          <div class="table-shell">${table.outerHTML}</div>
        </section>`
    })

    return { content: sections.join(''), recordCount: totalRows }
  }

  const fallback = root.cloneNode(true)
  removeNonReportContent(fallback)
  fallback.querySelectorAll('[class], [style]').forEach((element) => {
    element.removeAttribute('class')
    element.removeAttribute('style')
  })
  return {
    content: `<section class="report-section fallback-content">${fallback.innerHTML}</section>`,
    recordCount: 0,
  }
}

function buildRecordContent(sourceTable, row) {
  const headers = sourceTable.tHead?.rows?.[0]
    ? [...sourceTable.tHead.rows[0].cells].map((cell) => cell.textContent?.trim())
    : []

  const fields = [...row.cells].flatMap((cell, index) => {
    const label = headers[index] || `Field ${index + 1}`
    if (/^actions?$/i.test(label)) return []

    const value = cell.cloneNode(true)
    removeNonReportContent(value)
    value.querySelectorAll('[class], [style]').forEach((element) => {
      element.removeAttribute('class')
      element.removeAttribute('style')
    })
    value.removeAttribute('class')
    value.removeAttribute('style')

    const text = value.textContent?.replace(/\s+/g, ' ').trim()
    if (!text && !value.querySelector('img')) return []

    return [
      `<article class="record-field">
        <span class="field-label">${escapeHtml(label)}</span>
        <div class="field-value">${value.innerHTML}</div>
      </article>`,
    ]
  })

  const recordName =
    [...row.cells]
      .map((cell) => cell.textContent?.replace(/\s+/g, ' ').trim())
      .find((value) => value && !/^\d+$/.test(value) && value.toLowerCase() !== 'actions') ||
    'Selected record'

  return {
    recordName,
    content: `
      <section class="record-sheet">
        <div class="record-sheet-heading">
          <span>INDIVIDUAL ARCHIVE RECORD</span>
          <h2>${escapeHtml(recordName)}</h2>
          <p>Complete details captured from the current admin record.</p>
        </div>
        <div class="record-grid">${fields.join('')}</div>
      </section>`,
  }
}

function reportDocument({
  title,
  content,
  direction,
  mode,
  paperFormat,
  recordCount,
  recordName,
}) {
  const safeTitle = escapeHtml(title)
  const safeRecordName = escapeHtml(recordName || '')
  const logo = new URL('/khi-logo.jpg', window.location.origin).href
  const printedAt = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date())
  const reportLabel = mode === 'record' ? 'Individual Record' : 'Collection Report'
  const pageSize = PAPER_FORMATS.some((format) => format.value === paperFormat)
    ? paperFormat
    : mode === 'record' ? 'A4 portrait' : 'A4 landscape'
  const metaValue =
    mode === 'record'
      ? safeRecordName
      : `${Number(recordCount || 0).toLocaleString()} visible records`

  return `<!doctype html>
<html dir="${direction}" lang="${document.documentElement.lang || 'en'}">
  <head>
    <meta charset="utf-8" />
    <meta name="color-scheme" content="light" />
    <title>${safeTitle} · KHI Archive</title>
    <style>
      @page {
        size: ${pageSize};
        margin: 14mm 12mm 17mm;
      }
      :root {
        --pine: #173d30;
        --pine-deep: #0d2b21;
        --pine-soft: #eaf1ed;
        --gold: #b68a37;
        --gold-soft: #ead9ad;
        --ink: #18221d;
        --muted: #65716a;
        --line: #d9e0dc;
        --paper: #f8f5ec;
      }
      * { box-sizing: border-box; }
      html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body {
        margin: 0;
        color: var(--ink);
        background: #fff;
        font: 11px/1.55 Arial, "Noto Sans Arabic", sans-serif;
      }
      .report-masthead {
        position: relative;
        min-height: 112px;
        display: grid;
        grid-template-columns: 78px minmax(0, 1fr) auto;
        align-items: center;
        gap: 18px;
        overflow: hidden;
        margin-bottom: 18px;
        padding: 17px 22px;
        border-radius: 18px;
        background:
          radial-gradient(circle at 82% -30%, rgba(234,217,173,.2), transparent 42%),
          linear-gradient(135deg, var(--pine), var(--pine-deep));
        color: #fffdf5;
      }
      .report-masthead::after {
        content: "";
        position: absolute;
        inset-inline-end: -45px;
        bottom: -82px;
        width: 190px;
        height: 190px;
        border: 1px solid rgba(234,217,173,.17);
        border-radius: 50%;
      }
      .logo-wrap {
        width: 74px;
        height: 74px;
        display: grid;
        place-items: center;
        padding: 5px;
        border-radius: 50%;
        background: #fff;
        border: 2px solid var(--gold-soft);
        box-shadow: 0 12px 30px rgba(0,0,0,.22);
      }
      .logo-wrap img {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: contain;
        border-radius: 50%;
      }
      .brand-line {
        margin: 0 0 5px;
        color: var(--gold-soft);
        font-size: 8px;
        font-weight: 800;
        letter-spacing: .2em;
        text-transform: uppercase;
      }
      .masthead-copy h1 { margin: 0; font-size: 25px; line-height: 1.2; }
      .masthead-copy p { margin: 6px 0 0; color: rgba(255,253,245,.68); }
      .report-type {
        position: relative;
        z-index: 1;
        min-width: 142px;
        padding: 10px 13px;
        border: 1px solid rgba(234,217,173,.28);
        border-radius: 12px;
        background: rgba(255,255,255,.06);
        text-align: center;
      }
      .report-type span {
        display: block;
        color: var(--gold-soft);
        font-size: 7px;
        font-weight: 800;
        letter-spacing: .17em;
        text-transform: uppercase;
      }
      .report-type strong { display: block; margin-top: 4px; font-size: 12px; }
      .report-meta {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        margin-bottom: 24px;
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: #fff;
      }
      .meta-item { min-height: 53px; padding: 10px 14px; border-inline-start: 1px solid var(--line); background: linear-gradient(180deg, #fff, #fbfcfb); }
      .meta-item:first-child { border-inline-start: 0; }
      .meta-item span {
        display: block;
        margin-bottom: 3px;
        color: var(--muted);
        font-size: 7.5px;
        font-weight: 800;
        letter-spacing: .14em;
        text-transform: uppercase;
      }
      .meta-item strong { color: var(--pine); font-size: 10.5px; line-height: 1.45; }
      .report-section { margin-top: 22px; break-inside: auto; }
      .report-section + .report-section { break-before: page; }
      .section-heading {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 10px;
        padding-inline: 2px;
      }
      .section-kicker {
        display: block;
        color: var(--gold);
        font-size: 7px;
        font-weight: 800;
        letter-spacing: .16em;
      }
      .section-heading h2 { margin: 2px 0 0; color: var(--pine); font-size: 17px; }
      .section-count {
        padding: 5px 9px;
        border-radius: 999px;
        background: var(--pine-soft);
        color: var(--pine);
        font-size: 8.5px;
        font-weight: 800;
      }
      .table-shell {
        overflow: hidden;
        border: 1px solid #cbd6d0;
        border-radius: 14px;
        background: #fff;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: auto;
        font-size: 8.6px;
      }
      thead { display: table-header-group; }
      tr { break-inside: avoid; }
      th, td {
        padding: 8px 8px;
        border-inline-start: 1px solid #dce3df;
        border-bottom: 1px solid #dce3df;
        text-align: start;
        vertical-align: top;
        white-space: normal;
        overflow-wrap: anywhere;
      }
      th:first-child, td:first-child { border-inline-start: 0; }
      tbody tr:last-child td { border-bottom: 0; }
      th {
        background: var(--pine);
        color: #fffdf5;
        font-size: 7.5px;
        font-weight: 800;
        letter-spacing: .05em;
        text-transform: uppercase;
      }
      tbody tr:nth-child(even) td { background: #f5f8f6; }
      tbody tr:nth-child(odd) td { background: #fff; }
      td { color: #26332d; line-height: 1.55; }
      td img { width: 42px; height: 42px; object-fit: contain; border-radius: 8px; background: #fff; }
      a { color: inherit; text-decoration: none; }
      .record-sheet {
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 18px;
        background: linear-gradient(180deg, var(--paper), #fff 180px);
      }
      .record-sheet-heading {
        padding: 24px 27px 21px;
        border-bottom: 1px solid var(--line);
      }
      .record-sheet-heading span {
        color: var(--gold);
        font-size: 8px;
        font-weight: 800;
        letter-spacing: .18em;
      }
      .record-sheet-heading h2 { margin: 6px 0 4px; color: var(--pine); font-size: 23px; line-height: 1.25; }
      .record-sheet-heading p { margin: 0; color: var(--muted); font-size: 11px; }
      .record-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        padding: 16px 18px 22px;
      }
      .record-field {
        min-height: 86px;
        padding: 14px 14px 15px;
        border: 1px solid #d9e0dc;
        border-radius: 14px;
        background: #fff;
        break-inside: avoid;
        box-shadow: 0 6px 16px rgba(19,43,34,.04);
      }
      .field-label {
        display: block;
        margin-bottom: 8px;
        color: var(--gold);
        font-size: 7.5px;
        font-weight: 800;
        letter-spacing: .15em;
        text-transform: uppercase;
      }
      .field-value {
        color: var(--ink);
        font-size: 11.5px;
        font-weight: 650;
        line-height: 1.65;
        overflow-wrap: anywhere;
      }
      .field-value img {
        width: auto;
        max-width: 140px;
        max-height: 120px;
        object-fit: contain;
        border-radius: 10px;
      }
      .fallback-content { padding: 22px; border: 1px solid var(--line); border-radius: 14px; background: #fff; }
      .fallback-content img { max-width: 140px; max-height: 120px; object-fit: contain; }
      .fallback-content > * { margin-bottom: 12px; }
      .report-footer {
        position: fixed;
        right: 0;
        bottom: -10mm;
        left: 0;
        display: flex;
        justify-content: space-between;
        padding-top: 5px;
        border-top: 1px solid var(--line);
        color: var(--muted);
        font-size: 7px;
      }
      .page-number::after { content: "Page " counter(page); }
      @media print {
        body { background: #fff; }
      }
    </style>
  </head>
  <body>
    <header class="report-masthead">
      <div class="logo-wrap"><img src="${logo}" alt="KHI Archive logo" /></div>
      <div class="masthead-copy">
        <p class="brand-line">Kurdish Heritage Institute · Digital Archive</p>
        <h1>${safeTitle}</h1>
        <p>Official archive report generated from the administration workspace.</p>
      </div>
      <div class="report-type">
        <span>Report type</span>
        <strong>${reportLabel}</strong>
      </div>
    </header>

    <section class="report-meta">
      <div class="meta-item"><span>Archive</span><strong>KHI Archive Platform</strong></div>
      <div class="meta-item"><span>Report scope</span><strong>${metaValue}</strong></div>
      <div class="meta-item"><span>Generated</span><strong>${escapeHtml(printedAt)}</strong></div>
    </section>

    <main>${content}</main>
    <footer class="report-footer">
      <span>KHI Archive · Confidential administration report</span>
      <span class="page-number"></span>
    </footer>
  </body>
</html>`
}

function openPrintReport(options) {
  const printWindow = window.open('', '_blank', 'width=1280,height=900')
  if (!printWindow) return

  printWindow.opener = null
  printWindow.document.open()
  printWindow.document.write(reportDocument(options))
  printWindow.document.close()

  const printWhenReady = () => {
    printWindow.focus()
    printWindow.print()
  }

  if (printWindow.document.readyState === 'complete') {
    window.setTimeout(printWhenReady, 350)
  } else {
    printWindow.addEventListener('load', () => window.setTimeout(printWhenReady, 350), {
      once: true,
    })
  }
}

function AdminPrintManager({ children }) {
  const location = useLocation()
  const surfaceRef = useRef(null)
  const printable = isPrintablePath(location.pathname)
  const [paperFormat, setPaperFormat] = useState('A4 landscape')

  useEffect(() => {
    const stored = window.localStorage.getItem(PAPER_SIZE_STORAGE_KEY)
    if (stored && PAPER_FORMATS.some((format) => format.value === stored)) {
      setPaperFormat(stored)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(PAPER_SIZE_STORAGE_KEY, paperFormat)
  }, [paperFormat])

  const selectedPaperLabel = useMemo(
    () => PAPER_FORMATS.find((format) => format.value === paperFormat)?.label || 'A4 · Landscape',
    [paperFormat],
  )

  const printAll = () => {
    const root = surfaceRef.current
    if (!root) return

    const title = titleForPath(location.pathname, root)
    const report = buildAllRecordsContent(root, title)
    openPrintReport({
      title,
      content: report.content,
      recordCount: report.recordCount,
      direction: getComputedStyle(root).direction || 'ltr',
      mode: 'all',
      paperFormat,
    })
  }

  useEffect(() => {
    if (!printable || !surfaceRef.current) return undefined

    const root = surfaceRef.current
    const cleanups = new Map()

    const addRecordPrintButtons = () => {
      root.querySelectorAll('table tbody tr').forEach((row) => {
        if (
          cleanups.has(row) ||
          row.querySelector('[data-admin-print-record]') ||
          !isDataRow(row)
        ) {
          return
        }

        const hostCell = row.cells[row.cells.length - 1]
        const button = document.createElement('button')
        button.type = 'button'
        button.dataset.adminPrintRecord = 'true'
        button.className = 'admin-print-record-button'
        button.setAttribute('aria-label', 'Print this record')
        button.title = 'Print this record'
        button.innerHTML =
          '<span class="admin-print-record-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="admin-print-record-text">Print</span>'

        const onClick = (event) => {
          event.preventDefault()
          event.stopPropagation()

          const table = row.closest('table')
          if (!table) return
          const title = titleForPath(location.pathname, root)
          const record = buildRecordContent(table, row)

          openPrintReport({
            title: `${title} · Record`,
            content: record.content,
            recordName: record.recordName,
            direction: getComputedStyle(root).direction || 'ltr',
            mode: 'record',
            paperFormat,
          })
        }

        button.addEventListener('click', onClick)
        hostCell.append(button)
        cleanups.set(row, () => {
          button.removeEventListener('click', onClick)
          button.remove()
        })
      })
    }

    addRecordPrintButtons()
    const observer = new MutationObserver(addRecordPrintButtons)
    observer.observe(root, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      cleanups.forEach((cleanup) => cleanup())
      cleanups.clear()
    }
  }, [location.pathname, printable])

  return (
    <>
      {printable ? (
        <div className="admin-report-toolbar" data-admin-print-toolbar>
          <div className="admin-report-toolbar-copy">
            <span className="admin-report-toolbar-icon">
              <FileText aria-hidden="true" />
            </span>
            <span>
              <strong>Archive report</strong>
              <small>Print the current filtered view with KHI branding</small>
            </span>
          </div>
          <div className="admin-print-controls">
            <label className="admin-print-size-control">
              <span>Paper size</span>
              <div className="admin-print-size-shell">
                <select value={paperFormat} onChange={(e) => setPaperFormat(e.target.value)}>
                  {PAPER_FORMATS.map((format) => (
                    <option key={format.value} value={format.value}>{format.label}</option>
                  ))}
                </select>
                <ChevronDown aria-hidden="true" />
              </div>
            </label>
            <button type="button" className="admin-print-all-button" onClick={printAll}>
              <Printer aria-hidden="true" />
              <span>
                <strong>Print report</strong>
                <small>{selectedPaperLabel} · all visible records</small>
              </span>
            </button>
          </div>
        </div>
      ) : null}
      <div ref={surfaceRef} id="admin-print-surface">
        {children}
      </div>
    </>
  )
}

export { AdminPrintManager }
