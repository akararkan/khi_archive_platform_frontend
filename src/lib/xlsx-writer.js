// Dependency-free .xlsx (Office Open XML) workbook writer.
//
// The admin/employee "Excel + statistics" export needs a real spreadsheet —
// not a CSV — so column types, multiple sheets, a styled header row, frozen
// panes and filters survive into Excel / Numbers / Google Sheets. Rather than
// shipping a spreadsheet library for write-only use (imports are parsed on the
// backend), this builds the workbook by hand: an .xlsx file is just a ZIP of
// small XML parts, and a ZIP with STORE (no compression) entries is ~100 lines.
//
// Public API:
//   buildXlsxBlob({ sheets: [{ name, columns, rows, rtl?, archiveHeader? }] }) → Blob
//   parseSpreadsheetNumber(value) → canonical numeric string | null
//
// `columns` is an array of header labels; `rows` an array of string arrays.
// Values that look like clean numbers are written as numeric cells so Excel
// can sort/sum them; everything else is an inline string.
//
// `archiveHeader` switches a sheet from the plain one-row header to the KHI
// archive template layout (modelled on the institute's hand-made inventory
// workbooks): a merged, colour-banded section-group row, optional sparse
// explanation rows (English + Sorani), optional extra bold title rows (the
// Sorani column names), then the `columns` row (English names) that carries
// the autofilter. Shape:
//   { groups: [{ title, span, color }], hintRows: [string[]…], titleRows: [string[]…] }
// Group spans must cover every column in order; `color` is an ARGB string.

// ── numeric detection ──────────────────────────────────────────────────────
// Conservative on purpose: archive codes like "0012" (leading zero) or ids
// longer than 15 digits (float precision) must stay text.
const PLAIN_NUMBER_RE = /^-?(0|[1-9]\d{0,14})(\.\d{1,10})?$/
// Grouped numbers must start 1-9: "0,123" is not a real thousands-grouped
// number, so it stays text instead of silently becoming 123.
const GROUPED_NUMBER_RE = /^-?[1-9]\d{0,2}(,\d{3}){1,4}(\.\d{1,10})?$/

function parseSpreadsheetNumber(value) {
  const text = String(value ?? '').trim()
  if (!text) return null
  if (PLAIN_NUMBER_RE.test(text)) return text
  if (GROUPED_NUMBER_RE.test(text)) return text.replaceAll(',', '')
  return null
}

// ── XML helpers ────────────────────────────────────────────────────────────
// Control characters are invalid in XML 1.0 and make Excel refuse the file.
// eslint-disable-next-line no-control-regex
const XML_INVALID_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g
const CELL_TEXT_LIMIT = 32000 // Excel's hard cap is 32,767 chars per cell

function escapeXmlText(value) {
  return String(value ?? '')
    .replace(XML_INVALID_RE, '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function escapeXmlAttr(value) {
  return escapeXmlText(value).replaceAll('"', '&quot;').replaceAll("'", '&apos;')
}

// 0 → A, 25 → Z, 26 → AA …
function columnRef(index) {
  let ref = ''
  let n = index + 1
  while (n > 0) {
    const remainder = (n - 1) % 26
    ref = String.fromCharCode(65 + remainder) + ref
    n = (n - 1 - remainder) / 26
  }
  return ref
}

// Sheet names: ≤31 chars, no []:*?/\ and unique within the workbook.
function sanitizeSheetNames(sheets) {
  const used = new Set()
  return sheets.map((sheet, index) => {
    let base = String(sheet.name || `Sheet${index + 1}`)
      .replace(/[[\]:*?/\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 31)
      .trim() || `Sheet${index + 1}`

    let candidate = base
    let counter = 2
    while (used.has(candidate.toLowerCase())) {
      const suffix = ` (${counter})`
      candidate = base.slice(0, 31 - suffix.length) + suffix
      counter += 1
    }
    used.add(candidate.toLowerCase())
    return candidate
  })
}

// ── worksheet XML ──────────────────────────────────────────────────────────
// Style indexes match stylesXml below: 1 = header, 2 = body, 3 = body (zebra),
// 4 = hint; group banner/title styles are appended per group colour.
// Header cells always force text: a Sorani hint like "1965" must never turn
// into a numeric cell.
function cellXml(ref, value, styleId, forceText = false) {
  const text = String(value ?? '')
  if (!text) return `<c r="${ref}" s="${styleId}"/>`

  const numeric = forceText ? null : parseSpreadsheetNumber(text)
  if (numeric != null) return `<c r="${ref}" s="${styleId}" t="n"><v>${numeric}</v></c>`

  const clipped = text.length > CELL_TEXT_LIMIT ? `${text.slice(0, CELL_TEXT_LIMIT)}…` : text
  return `<c r="${ref}" s="${styleId}" t="inlineStr"><is><t xml:space="preserve">${escapeXmlText(clipped)}</t></is></c>`
}

function worksheetXml({ columns, rows, rtl, archiveHeader, colorStyles }) {
  const columnCount = Math.max(columns.length, 1)
  const header = archiveHeader?.groups?.length ? archiveHeader : null
  const hintRows = header?.hintRows ?? []
  const titleRows = header?.titleRows ?? []
  // Group banner + hint rows + extra title rows + the `columns` row itself.
  const headerRowCount = header ? 1 + hintRows.length + titleRows.length + 1 : 1
  const lastRow = rows.length + headerRowCount
  const lastCol = columnRef(columnCount - 1)
  const lastRef = `${lastCol}${lastRow}`

  // Column widths from the longest value (headers count too), sampled over the
  // first 400 rows so huge exports don't pay a full extra pass. Hint rows are
  // excluded — they wrap inside a tall row instead of widening the column.
  const widths = columns.map((label, colIndex) => {
    let max = String(label ?? '').length
    for (const titleRow of titleRows) {
      max = Math.max(max, String(titleRow[colIndex] ?? '').length)
    }
    const sample = Math.min(rows.length, 400)
    for (let i = 0; i < sample; i += 1) {
      const length = String(rows[i][colIndex] ?? '').length
      if (length > max) max = length
    }
    return Math.min(58, Math.max(header ? 12 : 9, Math.round(max * 1.08 + 2)))
  })

  const cols = widths
    .map((width, i) => `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`)
    .join('')

  const parts = []
  const merges = []
  let rowNumber = 1

  if (header) {
    // Per-column bold-title style, expanded from the group spans so the Sorani
    // and English title rows carry their group's colour band.
    const columnTitleStyle = []
    const bannerCells = []
    let startColumn = 0
    for (const group of header.groups) {
      const span = Math.max(1, Number(group.span) || 1)
      const styles = colorStyles.get(group.color)
      const bannerStyle = styles?.banner ?? 1
      bannerCells.push(cellXml(`${columnRef(startColumn)}${rowNumber}`, group.title, bannerStyle, true))
      for (let k = 1; k < span; k += 1) {
        bannerCells.push(`<c r="${columnRef(startColumn + k)}${rowNumber}" s="${bannerStyle}"/>`)
      }
      if (span > 1) {
        merges.push(`${columnRef(startColumn)}${rowNumber}:${columnRef(startColumn + span - 1)}${rowNumber}`)
      }
      for (let k = 0; k < span; k += 1) columnTitleStyle.push(styles?.title ?? 1)
      startColumn += span
    }
    parts.push(`<row r="${rowNumber}" ht="30" customHeight="1">${bannerCells.join('')}</row>`)
    rowNumber += 1

    for (const hintRow of hintRows) {
      const cells = columns.map((_, i) =>
        cellXml(`${columnRef(i)}${rowNumber}`, hintRow[i], 4, true),
      )
      parts.push(`<row r="${rowNumber}" ht="86" customHeight="1">${cells.join('')}</row>`)
      rowNumber += 1
    }

    for (const titleRow of titleRows) {
      const cells = columns.map((_, i) =>
        cellXml(`${columnRef(i)}${rowNumber}`, titleRow[i], columnTitleStyle[i] ?? 1, true),
      )
      parts.push(`<row r="${rowNumber}" ht="32" customHeight="1">${cells.join('')}</row>`)
      rowNumber += 1
    }

    const englishCells = columns.map((label, i) =>
      cellXml(`${columnRef(i)}${rowNumber}`, label, columnTitleStyle[i] ?? 1, true),
    )
    parts.push(`<row r="${rowNumber}" ht="30" customHeight="1">${englishCells.join('')}</row>`)
    rowNumber += 1
  } else {
    parts.push(
      `<row r="1" ht="24" customHeight="1">${columns
        .map((label, i) => cellXml(`${columnRef(i)}1`, label, 1, true))
        .join('')}</row>`,
    )
  }

  for (let r = 0; r < rows.length; r += 1) {
    const dataRowNumber = headerRowCount + r + 1
    const styleId = r % 2 === 1 ? 3 : 2
    const cells = []
    for (let c = 0; c < columnCount; c += 1) {
      cells.push(cellXml(`${columnRef(c)}${dataRowNumber}`, rows[r][c], styleId))
    }
    parts.push(`<row r="${dataRowNumber}">${cells.join('')}</row>`)
  }

  // The filter lives on the column-title row (the last header row) so Excel
  // filters the data, not the header block.
  const filter = rows.length > 0 ? `<autoFilter ref="A${headerRowCount}:${lastRef}"/>` : ''
  const mergeXml = merges.length
    ? `<mergeCells count="${merges.length}">${merges.map((ref) => `<mergeCell ref="${ref}"/>`).join('')}</mergeCells>`
    : ''

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:${lastRef}"/>
<sheetViews><sheetView workbookViewId="0"${rtl ? ' rightToLeft="1"' : ''}><pane ySplit="${headerRowCount}" topLeftCell="A${headerRowCount + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
${cols ? `<cols>${cols}</cols>` : ''}
<sheetData>${parts.join('')}</sheetData>
${filter}
${mergeXml}
</worksheet>`
}

// ── workbook styles ────────────────────────────────────────────────────────
// KHI print-report palette: pine header with warm white text, soft zebra.
// Styles 0–3 are the classic flat-sheet set; style 4 is the archive-template
// hint cell; each group colour used by any sheet's archiveHeader appends a
// banner xf (centred, merged group row) and a title xf (bold column names).
function solidFill(color) {
  return `<fill><patternFill patternType="solid"><fgColor rgb="${color}"/></patternFill></fill>`
}

function stylesXml(groupColors) {
  const groupFills = groupColors.map(solidFill).join('\n')
  const groupXfs = groupColors
    .map(
      (color, i) => `
<xf numFmtId="0" fontId="2" fillId="${5 + i}" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="${5 + i}" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>`,
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="4">
<font><sz val="11"/><name val="Calibri"/><color rgb="FF26332D"/></font>
<font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFDF5"/></font>
<font><b/><sz val="10.5"/><name val="Calibri"/><color rgb="FF26332D"/></font>
<font><i/><sz val="8.5"/><name val="Calibri"/><color rgb="FF65716A"/></font>
</fonts>
<fills count="${5 + groupColors.length}">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
${solidFill('FF173D30')}
${solidFill('FFF3F7F5')}
${solidFill('FFFBF8EE')}
${groupFills}
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFD9E0DC"/></left><right style="thin"><color rgb="FFD9E0DC"/></right><top style="thin"><color rgb="FFD9E0DC"/></top><bottom style="thin"><color rgb="FFD9E0DC"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${5 + groupColors.length * 2}">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
${groupXfs}
</cellXfs>
</styleSheet>`
}

const RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

function contentTypesXml(sheetCount) {
  const overrides = Array.from(
    { length: sheetCount },
    (_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${overrides}
</Types>`
}

function workbookXml(sheetNames) {
  const sheets = sheetNames
    .map(
      (name, i) =>
        `<sheet name="${escapeXmlAttr(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${sheets}</sheets>
</workbook>`
}

function workbookRelsXml(sheetCount) {
  const rels = Array.from(
    { length: sheetCount },
    (_, i) =>
      `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
  ).join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${rels}
<Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
}

// ── minimal ZIP (STORE method) ─────────────────────────────────────────────
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c
  }
  return table
})()

function crc32(bytes) {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function dosDateTime(date) {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  }
}

// Entries are stored uncompressed: sizes and CRCs are known up front, Excel
// and every unzip tool accept STORE, and the XML is small enough not to care.
function buildZip(files) {
  const encoder = new TextEncoder()
  const { time, date } = dosDateTime(new Date())
  const chunks = []
  const central = []
  let offset = 0

  for (const file of files) {
    const nameBytes = encoder.encode(file.name)
    const dataBytes = typeof file.data === 'string' ? encoder.encode(file.data) : file.data
    const crc = crc32(dataBytes)

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true) // version needed
    local.setUint16(6, 0x0800, true) // UTF-8 names
    local.setUint16(8, 0, true) // STORE
    local.setUint16(10, time, true)
    local.setUint16(12, date, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, dataBytes.length, true)
    local.setUint32(22, dataBytes.length, true)
    local.setUint16(26, nameBytes.length, true)
    local.setUint16(28, 0, true)
    chunks.push(local.buffer, nameBytes, dataBytes)

    const entry = new DataView(new ArrayBuffer(46))
    entry.setUint32(0, 0x02014b50, true)
    entry.setUint16(4, 20, true) // version made by
    entry.setUint16(6, 20, true) // version needed
    entry.setUint16(8, 0x0800, true)
    entry.setUint16(10, 0, true)
    entry.setUint16(12, time, true)
    entry.setUint16(14, date, true)
    entry.setUint32(16, crc, true)
    entry.setUint32(20, dataBytes.length, true)
    entry.setUint32(24, dataBytes.length, true)
    entry.setUint16(28, nameBytes.length, true)
    entry.setUint32(42, offset, true)
    central.push(entry.buffer, nameBytes)

    offset += 30 + nameBytes.length + dataBytes.length
  }

  const centralSize = central.reduce((sum, part) => sum + part.byteLength, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true)

  return new Blob([...chunks, ...central, end.buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

// ── public entry point ─────────────────────────────────────────────────────
function buildXlsxBlob({ sheets }) {
  const safeSheets = (sheets || []).filter(Boolean)
  if (safeSheets.length === 0) {
    throw new Error('buildXlsxBlob needs at least one sheet')
  }

  // Styles are workbook-global: collect every group colour used by any sheet
  // and hand each worksheet the banner/title style ids for its colours.
  const groupColors = []
  for (const sheet of safeSheets) {
    for (const group of sheet.archiveHeader?.groups ?? []) {
      if (group?.color && !groupColors.includes(group.color)) groupColors.push(group.color)
    }
  }
  const colorStyles = new Map(
    groupColors.map((color, i) => [color, { banner: 5 + i * 2, title: 6 + i * 2 }]),
  )

  const names = sanitizeSheetNames(safeSheets)
  const files = [
    { name: '[Content_Types].xml', data: contentTypesXml(safeSheets.length) },
    { name: '_rels/.rels', data: RELS_XML },
    { name: 'xl/workbook.xml', data: workbookXml(names) },
    { name: 'xl/_rels/workbook.xml.rels', data: workbookRelsXml(safeSheets.length) },
    { name: 'xl/styles.xml', data: stylesXml(groupColors) },
    ...safeSheets.map((sheet, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: worksheetXml({
        columns: sheet.columns || [],
        rows: sheet.rows || [],
        rtl: Boolean(sheet.rtl),
        archiveHeader: sheet.archiveHeader,
        colorStyles,
      }),
    })),
  ]

  return buildZip(files)
}

export { buildXlsxBlob, parseSpreadsheetNumber }
