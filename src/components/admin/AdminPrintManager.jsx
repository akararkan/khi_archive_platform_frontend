import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, FileSpreadsheet, FileText, Printer } from 'lucide-react'
import { useLocation } from 'react-router-dom'

import { useToast } from '@/hooks/use-toast'
import { buildArchiveSheet, resolveExportTemplate } from '@/lib/export-templates'
import { KHI_LOGO_FALLBACK_SRC, getActiveKhiLogo, resolveKhiLogoSrc } from '@/lib/khi-logo'
import { flattenRecords } from '@/lib/record-flattening'
import { getReportExportProvider } from '@/lib/report-export-store'
import { computeTableStatistics, pickDistributionColumns } from '@/lib/table-statistics'
import { buildXlsxBlob } from '@/lib/xlsx-writer'

// Report letterheads carry the logo uploaded in Admin → Settings (an absolute
// S3 URL the print window can load directly); the bundled file covers the case
// where no logo has been uploaded yet.
function printLogoSrc() {
  const record = getActiveKhiLogo()
  if (record?.imageUrl) return resolveKhiLogoSrc(record)
  return new URL(KHI_LOGO_FALLBACK_SRC, window.location.origin).href
}

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

function getInitialPaperFormat() {
  if (typeof window === 'undefined') return 'A4 landscape'
  const stored = window.localStorage.getItem(PAPER_SIZE_STORAGE_KEY)
  return stored && PAPER_FORMATS.some((format) => format.value === stored)
    ? stored
    : 'A4 landscape'
}

// Both dashboards share this manager: AdminLayout and EmployeeLayout wrap
// their Outlet in it, so print + Excel export work on every list page.
const PRINTABLE_PATHS = [
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
  '/employee/category',
  '/employee/person',
  '/employee/project',
  '/employee/items',
  '/employee/maqam',
  '/employee/physical-media',
  '/employee/corrections',
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
  '/employee/category': 'Categories',
  '/employee/person': 'Persons',
  '/employee/project': 'Projects',
  '/employee/items': 'List of Items',
  '/employee/maqam': 'Maqam List',
  '/employee/physical-media': 'Physical Media',
  '/employee/corrections': 'Corrections',
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
  return PRINTABLE_PATHS.some(
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
  // Visibility switches keep their state in aria-checked; turn them into
  // readable text before the button sweep below would delete them outright.
  node.querySelectorAll('[role="switch"]').forEach((element) => {
    const on = element.getAttribute('aria-checked') === 'true'
    element.replaceWith(document.createTextNode(on ? 'Yes' : 'No'))
  })
  node.querySelectorAll(NON_REPORT_SELECTOR).forEach((element) => element.remove())
  node.querySelectorAll('[aria-hidden="true"], svg').forEach((element) => element.remove())
  // Search-result keyword highlights (<mark> from ui/highlight.jsx) must not
  // reach reports or exports: with their classes stripped they would print in
  // the browser's default highlighter yellow. Unwrap them to plain text.
  node.querySelectorAll('mark').forEach((mark) => mark.replaceWith(...mark.childNodes))
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
  // Explicit per-table override wins — chart data tables and the analytics
  // report tables label themselves via data-print-title since their card
  // headers aren't CardTitle/h2/h3 elements.
  const explicit = table.dataset?.printTitle?.trim()
  if (explicit) return explicit
  const cardTitle = table
    .closest('[data-slot="card"]')
    ?.querySelector('[data-slot="card-title"], h2, h3')
    ?.textContent?.trim()
  if (cardTitle) return cardTitle
  return total > 1 ? `${fallback} · Section ${index + 1}` : `${fallback} records`
}

// Headline KPI tiles (StatCard / MetricTile) annotate themselves with
// data-print-stat + data-print-label/value/hint. The print report renders
// them as a stat strip right under the masthead so the page's headline
// numbers survive into the PDF — charts alone would be lost (SVG is
// stripped) and their companion data tables carry the detail instead.
function buildKpiStrip(root) {
  const tiles = [...root.querySelectorAll('[data-print-stat]')]
  const items = tiles
    .map((tile) => ({
      label: tile.getAttribute('data-print-label')?.trim(),
      value: tile.getAttribute('data-print-value')?.trim(),
      hint: tile.getAttribute('data-print-hint')?.trim(),
    }))
    .filter((item) => item.label && item.value)
  if (!items.length) return ''
  return `
    <section class="stat-strip">
      ${items
        .map(
          (item) => `
        <div class="stat-tile">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
          ${item.hint ? `<small>${escapeHtml(item.hint)}</small>` : ''}
        </div>`,
        )
        .join('')}
    </section>`
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

// ── Excel + statistics export ────────────────────────────────────────────
//
// "Print the whole table" stops scaling once a filtered view holds hundreds
// of records. The export path answers that: the visible records download as a
// real .xlsx workbook (one sheet per table, plus Report + Column statistics
// summary sheets), and what goes to the printer is a compact statistical
// profile of that workbook instead of every row. Values come from cell TEXT,
// so search highlights never reach the export by construction.

// Header cells keep their text (sort controls may live inside), only icons go.
function headerCellText(cell) {
  const clone = cell.cloneNode(true)
  clone.querySelectorAll('svg, [aria-hidden="true"], [data-no-print]').forEach((element) =>
    element.remove(),
  )
  return clone.textContent.replace(/\s+/g, ' ').trim()
}

function cellPlainText(cell) {
  const clone = cell.cloneNode(true)
  removeNonReportContent(clone)
  return clone.textContent.replace(/\s+/g, ' ').trim()
}

// DOM tables → plain data sections [{ title, columns, rows }].
function extractTablesData(root, fallbackTitle) {
  const tables = [...root.querySelectorAll('table')].filter(
    (table) =>
      !table.closest('[role="dialog"], [data-no-print]') &&
      [...table.tBodies].some((body) => [...body.rows].some(isDataRow)),
  )

  const sections = []
  tables.forEach((table, index) => {
    const headerCells = table.tHead?.rows?.[0] ? [...table.tHead.rows[0].cells] : []
    if (!headerCells.length) return

    const kept = headerCells
      .map((cell, cellIndex) => ({ label: headerCellText(cell), cellIndex }))
      .filter(({ label }) => !/^actions?$/i.test(label))

    const dataRows = [...table.tBodies].flatMap((body) => [...body.rows].filter(isDataRow))
    const rows = dataRows.map((row) => {
      const cells = [...row.cells]
      return kept.map(({ cellIndex }) => (cells[cellIndex] ? cellPlainText(cells[cellIndex]) : ''))
    })

    // Label-less columns that never carry text (thumbnails, spacers) are noise
    // in a spreadsheet; headered-but-empty columns stay — their emptiness is a
    // statistic in itself.
    const used = kept
      .map((column, position) => ({ ...column, position }))
      .filter(({ label, position }) => label || rows.some((row) => row[position]))
    if (!used.length || !rows.length) return

    sections.push({
      title: tableSectionTitle(table, fallbackTitle, index, tables.length),
      columns: used.map(({ label, position }) => label || `Column ${position + 1}`),
      rows: rows.map((row) => used.map(({ position }) => row[position])),
    })
  })

  return sections
}

// The report names the active search so the reader knows what "visible
// records" meant. Covers the shared toolbars' English placeholder and the
// Sorani "گەڕان" used on RTL surfaces; [data-search-input] is the opt-in.
function detectSearchQuery(root) {
  const inputs = root.querySelectorAll(
    'input[data-search-input], input[type="search"], input[placeholder*="search" i], input[placeholder*="گەڕان"]',
  )
  for (const input of inputs) {
    const value = input.value?.trim()
    if (value) return value
  }
  return ''
}

function exportFileName(title, date) {
  const slug =
    title
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'Archive'
  const pad = (value) => String(value).padStart(2, '0')
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}`
  return `KHI-${slug}-${stamp}.xlsx`
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}

function formatPercent(ratio) {
  return `${Math.round((ratio || 0) * 100)}%`
}

function formatStatNumber(value) {
  if (!Number.isFinite(value)) return '—'
  return Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

function truncateValue(value, max = 28) {
  const text = String(value)
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

// The range of a field's values — min – max for numbers, earliest → latest
// for dates. Text columns have no meaningful range.
function columnRangeHtml(profile) {
  if (profile.numeric) {
    return `${formatStatNumber(profile.numeric.min)} – ${formatStatNumber(profile.numeric.max)}`
  }
  if (profile.dates) {
    return `${escapeHtml(profile.dates.min.slice(0, 10))} → ${escapeHtml(profile.dates.max.slice(0, 10))}`
  }
  return '<span class="insight-note">—</span>'
}

// One sentence describing a column, styled for the printed report.
function columnInsightHtml(profile) {
  if (!profile.filled) {
    return '<span class="insight-note">No values in the visible records</span>'
  }
  if (profile.numeric) {
    return `<span class="insight-note">Numbers · min <b>${formatStatNumber(profile.numeric.min)}</b> · avg <b>${formatStatNumber(profile.numeric.mean)}</b> · max <b>${formatStatNumber(profile.numeric.max)}</b></span>`
  }
  if (profile.dates) {
    return `<span class="insight-note">Dates · earliest <b>${escapeHtml(profile.dates.min.slice(0, 10))}</b> · latest <b>${escapeHtml(profile.dates.max.slice(0, 10))}</b></span>`
  }
  if (profile.allUnique) {
    return '<span class="insight-note">Every value is unique — identifier-like column</span>'
  }
  if (profile.longText) {
    return `<span class="insight-note">Long text · average ${Math.round(profile.avgLength)} characters</span>`
  }
  const chips = profile.topValues
    .slice(0, 3)
    .map(
      (top) =>
        `<span class="chip"><b title="${escapeHtml(top.value)}">${escapeHtml(truncateValue(top.value))}</b><span>×${top.count.toLocaleString()}</span></span>`,
    )
    .join('')
  return `<div class="value-chips">${chips}</div>`
}

function distributionCardHtml(profile) {
  const shown = profile.topValues.slice(0, 6)
  const shownCount = shown.reduce((sum, top) => sum + top.count, 0)
  const other = profile.filled - shownCount
  const maxCount = shown[0]?.count || 1
  const barWidth = (count) => Math.min(100, Math.max(3, Math.round((count / maxCount) * 100)))

  const rows = shown
    .map(
      (top) => `
      <div class="dist-row">
        <span class="dist-label" title="${escapeHtml(top.value)}">${escapeHtml(truncateValue(top.value, 40))}</span>
        <div class="fill-track"><i style="width:${barWidth(top.count)}%"></i></div>
        <span class="dist-count">${top.count.toLocaleString()} · ${formatPercent(top.share)}</span>
      </div>`,
    )
    .join('')

  const otherRow =
    other > 0
      ? `<div class="dist-row"><span class="dist-label">Other values</span><div class="fill-track"><i style="width:${barWidth(other)}%; opacity:.4"></i></div><span class="dist-count">${other.toLocaleString()}</span></div>`
      : ''

  return `<article class="dist-card"><h3>${escapeHtml(profile.name)}</h3>${rows}${otherRow}</article>`
}

// The printed statistical summary — the "explanation" companion to the
// records-only workbook: Excel callout, headline tiles, then a column profile
// + value distributions per data sheet.
function buildStatisticsContent({ stats, totals, searchQuery, fileName, scopeNote }) {
  const completeness = totals.cells ? totals.filled / totals.cells : 0
  const sheetCount = stats.length

  const banner = `
    <section class="xls-callout">
      <span class="xls-badge">XLSX</span>
      <div class="xls-copy">
        <strong>${escapeHtml(fileName)}</strong>
        <span>${escapeHtml(scopeNote)} · ${sheetCount} data ${sheetCount === 1 ? 'sheet' : 'sheets'} · opens in Excel, Numbers, and Google Sheets.</span>
      </div>
      <div class="xls-meta">${totals.records.toLocaleString()} records<br/>${totals.columns.toLocaleString()} columns</div>
    </section>`

  const tiles = `
    <section class="stat-strip">
      <div class="stat-tile"><span>Records exported</span><strong>${totals.records.toLocaleString()}</strong><small>Complete contents in the workbook</small></div>
      <div class="stat-tile"><span>Data columns</span><strong>${totals.columns.toLocaleString()}</strong><small>Across ${stats.length.toLocaleString()} data ${stats.length === 1 ? 'sheet' : 'sheets'}</small></div>
      <div class="stat-tile"><span>Data completeness</span><strong>${formatPercent(completeness)}</strong><small>${totals.filled.toLocaleString()} of ${totals.cells.toLocaleString()} cells filled</small></div>
      <div class="stat-tile"><span>Search filter</span><strong>${searchQuery ? escapeHtml(truncateValue(searchQuery, 22)) : '—'}</strong><small>${searchQuery ? 'Applied before this export' : 'None — all matching records'}</small></div>
    </section>`

  const sections = stats
    .map((section) => {
      const statistics = section.statistics
      const profileRows = statistics.profiles
        .map(
          (profile) => `
        <tr>
          <td><strong>${escapeHtml(profile.name)}</strong></td>
          <td>${profile.filled.toLocaleString()}</td>
          <td><div class="fill-wrap"><div class="fill-track"><i style="width:${Math.max(2, Math.round(profile.fillRate * 100))}%"></i></div><span class="fill-pct">${formatPercent(profile.fillRate)}</span></div></td>
          <td>${profile.distinct.toLocaleString()}</td>
          <td class="range-cell">${columnRangeHtml(profile)}</td>
          <td>${columnInsightHtml(profile)}</td>
        </tr>`,
        )
        .join('')

      const distributions = pickDistributionColumns(statistics)
        .map(distributionCardHtml)
        .join('')

      return `
      <section class="report-section stats-flow">
        <div class="section-heading">
          <div>
            <span class="section-kicker">STATISTICAL PROFILE</span>
            <h2>${escapeHtml(section.title)}</h2>
          </div>
          <span class="section-count">${statistics.rowCount.toLocaleString()} records · ${statistics.columnCount.toLocaleString()} columns</span>
        </div>
        <div class="table-shell">
          <table class="profile-table">
            <thead><tr><th>Column</th><th>Filled</th><th>Completeness</th><th>Distinct</th><th>Range</th><th>What the column holds</th></tr></thead>
            <tbody>${profileRows}</tbody>
          </table>
        </div>
        ${distributions ? `<div class="dist-grid">${distributions}</div>` : ''}
      </section>`
    })
    .join('')

  return banner + tiles + sections
}

function reportDocument({
  title,
  content,
  direction,
  mode,
  paperFormat,
  recordCount,
  recordName,
  subtitle,
}) {
  const safeTitle = escapeHtml(title)
  const safeRecordName = escapeHtml(recordName || '')
  const logo = printLogoSrc()
  const printedAt = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date())
  const reportLabel =
    mode === 'record'
      ? 'Individual Record'
      : mode === 'stats'
        ? 'Statistical Summary'
        : 'Collection Report'
  const pageSize = PAPER_FORMATS.some((format) => format.value === paperFormat)
    ? paperFormat
    : mode === 'all' ? 'A4 landscape' : 'A4 portrait'
  const metaValue =
    mode === 'record'
      ? safeRecordName
      : mode === 'stats'
        ? `${Number(recordCount || 0).toLocaleString()} records → Excel workbook`
        : `${Number(recordCount || 0).toLocaleString()} visible records`
  const safeSubtitle = escapeHtml(
    subtitle || 'Official archive report generated from the KHI management workspace.',
  )

  return `<!doctype html>
<html dir="${direction}" lang="${document.documentElement.lang || 'en'}">
  <head>
    <meta charset="utf-8" />
    <meta name="color-scheme" content="light" />
    <title>${safeTitle} · KHI Archive</title>
    <style>
      @page {
        size: ${pageSize};
        margin: 16mm 13mm 18mm;
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
        font: 11.5px/1.6 Arial, "Noto Sans Arabic", sans-serif;
      }
      p, li, td { orphans: 3; widows: 3; }
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
      .stat-strip {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 22px;
      }
      .stat-tile {
        min-height: 58px;
        padding: 12px 14px;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: linear-gradient(180deg, #fff, #fbfcfb);
        break-inside: avoid;
      }
      .stat-tile span {
        display: block;
        margin-bottom: 4px;
        color: var(--muted);
        font-size: 7.5px;
        font-weight: 800;
        letter-spacing: .14em;
        text-transform: uppercase;
      }
      .stat-tile strong { color: var(--pine); font-size: 17px; line-height: 1.2; }
      .stat-tile small { display: block; margin-top: 3px; color: var(--muted); font-size: 8px; }
      .report-section { margin-top: 24px; break-inside: auto; }
      .report-section + .report-section { break-before: page; }
      .section-heading {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 12px;
        padding-inline: 2px;
        break-after: avoid-page;
      }
      .section-kicker {
        display: block;
        color: var(--gold);
        font-size: 7px;
        font-weight: 800;
        letter-spacing: .16em;
      }
      .section-heading h2 { margin: 3px 0 0; color: var(--pine); font-size: 18px; line-height: 1.3; }
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
        font-size: 9.4px;
      }
      caption { display: none; }
      thead { display: table-header-group; }
      tr { break-inside: avoid; }
      th, td {
        padding: 9px 10px;
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
        font-size: 8px;
        font-weight: 800;
        letter-spacing: .06em;
        text-transform: uppercase;
      }
      tbody tr:nth-child(even) td { background: #f5f8f6; }
      tbody tr:nth-child(odd) td { background: #fff; }
      td { color: #26332d; line-height: 1.6; }
      tfoot td {
        background: var(--pine-soft);
        color: var(--pine);
        font-weight: 800;
        border-top: 2px solid var(--pine);
      }
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
        gap: 14px;
        padding: 18px 20px 24px;
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
        font-size: 12px;
        font-weight: 650;
        line-height: 1.7;
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
      /* ── statistical summary (Excel export companion) ─────────────── */
      .xls-callout {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 18px;
        padding: 14px 18px;
        border: 1px solid #e3d5b3;
        border-radius: 14px;
        background: linear-gradient(135deg, #fdf8ec, #faf3df);
        break-inside: avoid;
      }
      .xls-badge {
        display: grid;
        place-items: center;
        width: 46px;
        height: 46px;
        flex: 0 0 46px;
        border-radius: 12px;
        background: linear-gradient(145deg, #b68a37, #8f6a25);
        color: #fffdf5;
        font-size: 8.5px;
        font-weight: 800;
        letter-spacing: .09em;
      }
      .xls-copy { min-width: 0; flex: 1; }
      .xls-copy strong {
        display: block;
        color: #6d5219;
        font-family: "Courier New", monospace;
        font-size: 11.5px;
        overflow-wrap: anywhere;
      }
      .xls-copy span { display: block; margin-top: 3px; color: #8a6f33; font-size: 8.5px; }
      .xls-meta {
        color: #6d5219;
        font-size: 8.5px;
        font-weight: 800;
        line-height: 1.6;
        text-align: end;
        white-space: nowrap;
      }
      .report-section.stats-flow + .report-section.stats-flow { break-before: auto; }
      .profile-table th { font-size: 7.6px; }
      .profile-table td { font-size: 9px; }
      .profile-table td.range-cell { color: var(--pine); font-weight: 750; white-space: nowrap; }
      .fill-wrap { display: flex; align-items: center; gap: 7px; min-width: 96px; }
      .fill-track {
        flex: 1;
        height: 5px;
        min-width: 40px;
        border-radius: 999px;
        background: #e6ece9;
        overflow: hidden;
      }
      .fill-track i {
        display: block;
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, #2a5946, #173d30);
      }
      .fill-pct { min-width: 27px; color: var(--pine); font-size: 8.5px; font-weight: 800; }
      .value-chips { display: flex; flex-wrap: wrap; gap: 4px; }
      .chip {
        display: inline-flex;
        align-items: baseline;
        gap: 4px;
        padding: 2px 7px;
        border: 1px solid #dfe6e2;
        border-radius: 999px;
        background: #fff;
        font-size: 8px;
        white-space: nowrap;
      }
      .chip b { max-width: 150px; overflow: hidden; color: #26332d; font-weight: 750; text-overflow: ellipsis; }
      .chip span { color: var(--muted); font-weight: 700; }
      .insight-note { color: var(--muted); font-size: 8.5px; }
      .insight-note b { color: var(--pine); }
      .dist-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-top: 12px;
      }
      .dist-card {
        padding: 12px 14px;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: linear-gradient(180deg, #fff, #fbfcfb);
        break-inside: avoid;
      }
      .dist-card h3 {
        margin: 0 0 8px;
        color: var(--pine);
        font-size: 9.5px;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .dist-row {
        display: grid;
        grid-template-columns: 88px minmax(0, 1fr) auto;
        gap: 8px;
        align-items: center;
        margin: 4px 0;
        font-size: 8.4px;
      }
      .dist-label {
        overflow: hidden;
        color: #26332d;
        font-weight: 700;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .dist-count { color: var(--muted); font-weight: 800; white-space: nowrap; }
      .report-footer {
        position: fixed;
        right: 0;
        bottom: -11mm;
        left: 0;
        display: flex;
        justify-content: space-between;
        padding-top: 5px;
        border-top: 1px solid var(--line);
        color: var(--muted);
        font-size: 7.5px;
      }
      .page-number::after { content: "Page " counter(page); }
      @media print {
        body { background: #fff; }
      }
    </style>
  </head>
  <body>
    <header class="report-masthead">
      <div class="logo-wrap"><img src="${escapeHtml(logo)}" alt="KHI Archive logo" /></div>
      <div class="masthead-copy">
        <p class="brand-line">Kurdish Heritage Institute · Digital Archive</p>
        <h1>${safeTitle}</h1>
        <p>${safeSubtitle}</p>
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
      <span>KHI Archive · Confidential archive report</span>
      <span class="page-number"></span>
    </footer>
  </body>
</html>`
}

// Opens the report window immediately (inside the user's click, so pop-up
// blockers allow it) with a small "preparing…" shell; `render` swaps in the
// finished report once async data is ready, `close` abandons it on failure.
function openDeferredPrintReport() {
  const printWindow = window.open('', '_blank', 'width=1280,height=900')
  if (!printWindow) return null

  printWindow.opener = null
  printWindow.document.open()
  printWindow.document.write(`<!doctype html>
<html><head><meta charset="utf-8" /><title>KHI Archive · Preparing report…</title></head>
<body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#f8f5ec;color:#173d30;font:600 15px/1.6 Arial,sans-serif;">
  <p>Preparing the statistical report…</p>
</body></html>`)
  printWindow.document.close()

  return {
    render(options) {
      if (printWindow.closed) return
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
    },
    close() {
      if (!printWindow.closed) printWindow.close()
    },
  }
}

// Returns false when the pop-up was blocked so callers can tell the user.
function openPrintReport(options) {
  const pending = openDeferredPrintReport()
  pending?.render(options)
  return Boolean(pending)
}

function AdminPrintManager({ children }) {
  const location = useLocation()
  const toast = useToast()
  const surfaceRef = useRef(null)
  const printable = isPrintablePath(location.pathname)
  const [paperFormat, setPaperFormat] = useState(getInitialPaperFormat)
  const [isExporting, setIsExporting] = useState(false)

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
    // Headline KPI tiles print as a stat strip above the data sections.
    const kpiStrip = buildKpiStrip(root)
    const opened = openPrintReport({
      title,
      content: kpiStrip + report.content,
      recordCount: report.recordCount,
      direction: getComputedStyle(root).direction || 'ltr',
      mode: 'all',
      paperFormat,
    })
    if (!opened) {
      toast.error('Pop-up blocked', 'Allow pop-ups for this site to open the print report.')
    }
  }

  // Excel + statistics — split exactly as: the .xlsx carries the REAL records
  // with their complete field contents; the print window carries the
  // explanation (a statistical profile of that workbook), never the rows.
  //
  // Records come from the page's registered export provider (full DTOs for
  // the whole matching result set, fetched from the API); pages without a
  // provider fall back to scraping the visible table.
  const exportExcelReport = async () => {
    const root = surfaceRef.current
    if (!root || isExporting) return

    const title = titleForPath(location.pathname, root)
    const provider = getReportExportProvider()
    // Opened synchronously inside the click so pop-up blockers allow it.
    const pending = openDeferredPrintReport()
    if (!pending) {
      toast.toast(
        'Pop-up blocked',
        'The Excel will still download — allow pop-ups to also get the printed statistical summary.',
      )
    }
    setIsExporting(true)

    try {
      let sections = []
      let scopeNote = 'Records visible on this page'

      if (provider) {
        const provided = await provider()
        // Provider records get the KHI archive-template layout: grouped,
        // bilingual (Sorani + English) header block over the full DTO
        // columns, exactly like the institute's hand-made inventory sheets.
        const template = resolveExportTemplate(location.pathname)
        const providedSections = (provided?.sections ?? [])
          .filter((section) => Array.isArray(section?.records) && section.records.length > 0)
          .map((section) => ({
            title: section.title || title,
            ...buildArchiveSheet({
              ...flattenRecords(section.records, { labels: section.labels, omit: section.omit }),
              template,
            }),
          }))
        if (providedSections.length) {
          sections = providedSections
          scopeNote = provided?.truncated
            ? 'Result set capped at 20,000 records — narrow the search for a complete export'
            : 'Complete matching result set with full record contents'
        }
      }

      if (!sections.length) {
        sections = extractTablesData(root, title)
      }
      if (!sections.length) {
        pending?.close()
        toast.error('Nothing to export', 'No records are visible on this page right now.')
        return
      }

      const generatedAt = new Date()
      const direction = getComputedStyle(root).direction || 'ltr'
      const rtl = direction === 'rtl'
      const searchQuery = detectSearchQuery(root)
      const stats = sections.map((section) => ({
        ...section,
        statistics: computeTableStatistics(section),
      }))
      const totals = stats.reduce(
        (sums, section) => ({
          records: sums.records + section.statistics.rowCount,
          columns: sums.columns + section.statistics.columnCount,
          filled: sums.filled + section.statistics.filledCells,
          cells: sums.cells + section.statistics.totalCells,
        }),
        { records: 0, columns: 0, filled: 0, cells: 0 },
      )
      const fileName = exportFileName(title, generatedAt)

      // Records only — no statistics sheets inside the Excel; the printed
      // report is where the explanation lives. Archive-template sheets are
      // RTL like the hand-made inventory workbooks; DOM-scrape fallback
      // sheets follow the page direction.
      const workbook = buildXlsxBlob({
        sheets: stats.map((section) => ({
          name: section.title,
          columns: section.columns,
          rows: section.rows,
          rtl: section.rtl ?? rtl,
          archiveHeader: section.archiveHeader,
        })),
      })
      downloadBlob(workbook, fileName)
      toast.success('Excel exported', `${fileName} · ${totals.records.toLocaleString()} records`)

      pending?.render({
        title,
        content: buildStatisticsContent({ stats, totals, searchQuery, fileName, scopeNote }),
        recordCount: totals.records,
        direction,
        mode: 'stats',
        paperFormat,
        subtitle: 'Statistical companion to the exported Excel workbook.',
      })
    } catch (error) {
      pending?.close()
      toast.apiError(error, 'Excel export failed')
    } finally {
      setIsExporting(false)
    }
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
          !isDataRow(row) ||
          // Chart companion tables (sr-only accessibility/print tables
          // inside the analytics charts) are data, not records — no
          // per-row Print buttons.
          row.closest('[data-chart-table]')
        ) {
          return
        }

        const hostCell = row.cells[row.cells.length - 1]
        const host = hostCell.querySelector('[data-admin-print-target]') || hostCell
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

          const opened = openPrintReport({
            title: `${title} · Record`,
            content: record.content,
            recordName: record.recordName,
            direction: getComputedStyle(root).direction || 'ltr',
            mode: 'record',
            paperFormat,
          })
          if (!opened) {
            toast.error('Pop-up blocked', 'Allow pop-ups for this site to print this record.')
          }
        }

        button.addEventListener('click', onClick)
        host.append(button)
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
  }, [location.pathname, paperFormat, printable, toast])

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
              <small>Print or export the current filtered view with KHI branding</small>
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
            <button
              type="button"
              className="admin-print-all-button admin-excel-button"
              disabled={isExporting}
              onClick={exportExcelReport}
            >
              <FileSpreadsheet aria-hidden="true" />
              <span>
                <strong>{isExporting ? 'Preparing export…' : 'Excel + statistics'}</strong>
                <small>
                  {isExporting
                    ? 'Fetching all matching records'
                    : 'records → .xlsx · statistics → printed report'}
                </small>
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
