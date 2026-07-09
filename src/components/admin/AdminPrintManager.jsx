import { useEffect, useRef } from 'react'
import { Printer } from 'lucide-react'
import { useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/button'

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

function removeNonReportContent(node) {
  node
    .querySelectorAll(
      [
        '[data-admin-print-toolbar]',
        '[data-admin-print-record]',
        '[data-no-print]',
        '[role="dialog"]',
        'button',
        'input',
        'select',
        'textarea',
        '[data-slot="pagination"]',
      ].join(','),
    )
    .forEach((element) => element.remove())

  node.querySelectorAll('[aria-hidden="true"]').forEach((element) => element.remove())
}

function reportDocument({ title, content, direction }) {
  const logo = new URL('/khi-logo.jpg', window.location.origin).href
  const printedAt = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date())

  return `<!doctype html>
<html dir="${direction}" lang="${document.documentElement.lang || 'en'}">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      @page { size: A4 landscape; margin: 13mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #17231d;
        background: #fff;
        font: 12px/1.55 Arial, "Noto Sans Arabic", sans-serif;
      }
      .report-header {
        display: flex;
        align-items: center;
        gap: 14px;
        padding-bottom: 14px;
        margin-bottom: 18px;
        border-bottom: 2px solid #264c3d;
      }
      .report-header img {
        width: 58px;
        height: 58px;
        object-fit: contain;
        border-radius: 50%;
        border: 1px solid #d8c89e;
      }
      .report-heading { flex: 1; }
      .report-heading h1 { margin: 0; color: #193d30; font-size: 22px; }
      .report-heading p { margin: 3px 0 0; color: #66736c; font-size: 11px; }
      .report-mark {
        color: #8a6a25;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .16em;
        text-transform: uppercase;
      }
      h1, h2, h3, p { break-after: avoid; }
      h1 { font-size: 22px; }
      h2 { font-size: 17px; }
      h3 { font-size: 14px; }
      section, article, [data-slot="card"] { break-inside: avoid; }
      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: auto;
        font-size: 10px;
      }
      th, td {
        padding: 7px 8px;
        border: 1px solid #ccd5d0;
        text-align: start;
        vertical-align: top;
        white-space: normal !important;
        overflow-wrap: anywhere;
      }
      th { color: #173d2f; background: #edf3ef; font-weight: 700; }
      tr:nth-child(even) td { background: #f8faf9; }
      img { max-width: 100%; }
      svg { width: 14px; height: 14px; }
      a { color: inherit; text-decoration: none; }
      [class*="overflow"] { overflow: visible !important; }
      [class*="truncate"] { overflow: visible !important; text-overflow: clip !important; white-space: normal !important; }
      .report-content > :first-child { margin-top: 0; }
      .report-footer {
        margin-top: 18px;
        padding-top: 9px;
        border-top: 1px solid #d9dfdc;
        color: #718078;
        font-size: 10px;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <header class="report-header">
      <img src="${logo}" alt="KHI Archive logo" />
      <div class="report-heading">
        <h1>${title}</h1>
        <p>Generated ${printedAt}</p>
      </div>
      <div class="report-mark">KHI Archive Report</div>
    </header>
    <main class="report-content">${content}</main>
    <footer class="report-footer">KHI Archive Platform · ${title}</footer>
  </body>
</html>`
}

function openPrintReport({ title, content, direction = 'ltr' }) {
  const printWindow = window.open('', '_blank', 'width=1200,height=850')
  if (!printWindow) return

  printWindow.opener = null
  printWindow.document.open()
  printWindow.document.write(reportDocument({ title, content, direction }))
  printWindow.document.close()

  const printWhenReady = () => {
    printWindow.focus()
    printWindow.print()
  }

  if (printWindow.document.readyState === 'complete') {
    window.setTimeout(printWhenReady, 180)
  } else {
    printWindow.addEventListener('load', () => window.setTimeout(printWhenReady, 180), {
      once: true,
    })
  }
}

function AdminPrintManager({ children }) {
  const location = useLocation()
  const surfaceRef = useRef(null)
  const printable = isPrintablePath(location.pathname)

  const printAll = () => {
    const root = surfaceRef.current
    if (!root) return

    const clone = root.cloneNode(true)
    removeNonReportContent(clone)
    openPrintReport({
      title: titleForPath(location.pathname, root),
      content: clone.innerHTML,
      direction: getComputedStyle(root).direction || 'ltr',
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
          row.cells.length < 2
        ) {
          return
        }

        const text = row.textContent?.replace(/\s+/g, ' ').trim()
        if (!text || row.querySelector('[data-slot="skeleton"]')) return

        const hostCell = row.cells[row.cells.length - 1]
        const button = document.createElement('button')
        button.type = 'button'
        button.dataset.adminPrintRecord = 'true'
        button.className = 'admin-print-record-button'
        button.setAttribute('aria-label', 'Print this record')
        button.title = 'Print record'
        button.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg><span>Print record</span>'

        const onClick = (event) => {
          event.preventDefault()
          event.stopPropagation()

          const table = row.closest('table')
          const reportTable = document.createElement('table')
          if (table?.tHead) reportTable.append(table.tHead.cloneNode(true))
          const body = document.createElement('tbody')
          body.append(row.cloneNode(true))
          reportTable.append(body)
          removeNonReportContent(reportTable)

          openPrintReport({
            title: `${titleForPath(location.pathname, root)} — Record`,
            content: reportTable.outerHTML,
            direction: getComputedStyle(root).direction || 'ltr',
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
        <div
          className="mb-5 flex items-center justify-end border-b border-border pb-4"
          data-admin-print-toolbar
        >
          <Button type="button" variant="outline" className="gap-2" onClick={printAll}>
            <Printer className="size-4" />
            Print all
          </Button>
        </div>
      ) : null}
      <div ref={surfaceRef} id="admin-print-surface">
        {children}
      </div>
    </>
  )
}

export { AdminPrintManager }
