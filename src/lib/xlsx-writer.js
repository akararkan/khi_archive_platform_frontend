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
//   buildXlsxBlob({ sheets: [{ name, columns, rows, rtl?, archiveHeader? }], logo? }) → Blob
//   parseSpreadsheetNumber(value) → canonical numeric string | null
//
// `columns` is an array of header labels; `rows` an array of string arrays.
// Values that look like clean numbers are written as numeric cells so Excel
// can sort/sum them; everything else is an inline string.
//
// `archiveHeader` switches a sheet from the plain one-row header to the KHI
// archive template layout (modelled on the institute's hand-made inventory
// workbooks): a two-row branded masthead, a merged colour-banded
// section-group row, optional sparse explanation rows (English + Sorani),
// optional extra bold title rows (the Sorani column names), then the
// `columns` row (English names) that carries the autofilter. Shape:
//   {
//     masthead?: { brand, subtitle },
//     groups: [{ title, span, color, tint }],   // color = banner, tint = title rows
//     hintRows: [string[]…],
//     titleRows: [string[]…],
//   }
// Group spans must cover every column in order; colours are ARGB strings.
//
// `logo` is optional PNG/JPEG bytes (Uint8Array); when present, every
// masthead sheet gets the image anchored over its masthead via a standard
// spreadsheetDrawing part.

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

function worksheetXml({ columns, rows, rtl, archiveHeader, colorStyles, drawingRelId }) {
  const columnCount = Math.max(columns.length, 1)
  const header = archiveHeader?.groups?.length ? archiveHeader : null
  const masthead = header?.masthead
  const hintRows = header?.hintRows ?? []
  const titleRows = header?.titleRows ?? []
  // Masthead + group banner + hint rows + extra title rows + `columns` row.
  const headerRowCount = header
    ? (masthead ? 2 : 0) + 1 + hintRows.length + titleRows.length + 1
    : 1
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
    if (masthead) {
      // Two branded rows merged across the sheet: institute name, then the
      // sheet title with record count and generation date. The logo drawing
      // (when provided) floats over these rows.
      parts.push(
        `<row r="1" ht="44" customHeight="1">${columns
          .map((_, i) => cellXml(`${columnRef(i)}1`, i === 0 ? masthead.brand : '', 5, true))
          .join('')}</row>`,
      )
      parts.push(
        `<row r="2" ht="22" customHeight="1">${columns
          .map((_, i) => cellXml(`${columnRef(i)}2`, i === 0 ? masthead.subtitle : '', 6, true))
          .join('')}</row>`,
      )
      if (columnCount > 1) {
        merges.push(`A1:${lastCol}1`, `A2:${lastCol}2`)
      }
      rowNumber = 3
    }

    // Per-column bold-title style, expanded from the group spans so the Sorani
    // and English title rows carry their group's colour band.
    const columnTitleStyle = []
    const bannerCells = []
    let startColumn = 0
    for (const group of header.groups) {
      const span = Math.max(1, Number(group.span) || 1)
      const styles = colorStyles.get(`${group.color}|${group.tint}`)
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

  // Archive sheets read like a document: gridlines off, pine sheet tab.
  const sheetPr = header ? '<sheetPr><tabColor rgb="FF173D30"/></sheetPr>' : ''
  const gridlines = header ? ' showGridLines="0"' : ''
  const drawing = drawingRelId ? `<drawing r:id="${drawingRelId}"/>` : ''

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
${sheetPr}
<dimension ref="A1:${lastRef}"/>
<sheetViews><sheetView workbookViewId="0"${gridlines}${rtl ? ' rightToLeft="1"' : ''}><pane ySplit="${headerRowCount}" topLeftCell="A${headerRowCount + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
${cols ? `<cols>${cols}</cols>` : ''}
<sheetData>${parts.join('')}</sheetData>
${filter}
${mergeXml}
${drawing}
</worksheet>`
}

// ── workbook styles ────────────────────────────────────────────────────────
// KHI print-report palette: pine header with warm white text, soft zebra.
// Styles 0–3 are the classic flat-sheet set; 4 is the archive-template hint
// cell; 5–6 the branded masthead rows; each group colour pair used by any
// sheet's archiveHeader appends a banner xf (saturated fill, warm white,
// centred) and a title xf (light tint, dark bold — Sorani/English names).
function solidFill(color) {
  return `<fill><patternFill patternType="solid"><fgColor rgb="${color}"/></patternFill></fill>`
}

function stylesXml(groupColorPairs) {
  const groupFills = groupColorPairs
    .map((pair) => `${solidFill(pair.color)}\n${solidFill(pair.tint)}`)
    .join('\n')
  const groupXfs = groupColorPairs
    .map(
      (pair, i) => `
<xf numFmtId="0" fontId="1" fillId="${6 + i * 2}" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="${7 + i * 2}" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>`,
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="6">
<font><sz val="11"/><name val="Calibri"/><color rgb="FF26332D"/></font>
<font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFDF5"/></font>
<font><b/><sz val="10.5"/><name val="Calibri"/><color rgb="FF26332D"/></font>
<font><i/><sz val="8.5"/><name val="Calibri"/><color rgb="FF65716A"/></font>
<font><b/><sz val="15"/><name val="Calibri"/><color rgb="FFFFFDF5"/></font>
<font><sz val="10"/><name val="Calibri"/><color rgb="FFEAD9AD"/></font>
</fonts>
<fills count="${6 + groupColorPairs.length * 2}">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
${solidFill('FF173D30')}
${solidFill('FFF3F7F5')}
${solidFill('FFFBF8EE')}
${solidFill('FF0D2B21')}
${groupFills}
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFD9E0DC"/></left><right style="thin"><color rgb="FFD9E0DC"/></right><top style="thin"><color rgb="FFD9E0DC"/></top><bottom style="thin"><color rgb="FFD9E0DC"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${7 + groupColorPairs.length * 2}">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="4" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="5" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
${groupXfs}
</cellXfs>
</styleSheet>`
}

const RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

function contentTypesXml(sheetCount, { imageExtension, drawingCount } = {}) {
  const overrides = Array.from(
    { length: sheetCount },
    (_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join('')
  const imageDefault = imageExtension
    ? `<Default Extension="${imageExtension}" ContentType="image/${imageExtension}"/>`
    : ''
  const drawingOverrides = Array.from(
    { length: drawingCount || 0 },
    (_, i) =>
      `<Override PartName="/xl/drawings/drawing${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`,
  ).join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
${imageDefault}
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${overrides}
${drawingOverrides}
</Types>`
}

// ── logo drawing parts ─────────────────────────────────────────────────────
// One shared image part; each masthead sheet gets its own drawing anchored
// over the masthead rows (in RTL sheets cell A1 sits visually at the top
// right, mirroring the print-report letterhead).
function detectImageExtension(bytes) {
  if (!bytes || bytes.length < 4) return null
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpeg'
  return null
}

// 9525 EMU per pixel; the masthead is 66px tall, the logo floats at ~58px.
const LOGO_EMU = 58 * 9525
const LOGO_OFFSET_EMU = 4 * 9525

function drawingXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<xdr:oneCellAnchor>
<xdr:from><xdr:col>0</xdr:col><xdr:colOff>${LOGO_OFFSET_EMU}</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>${LOGO_OFFSET_EMU}</xdr:rowOff></xdr:from>
<xdr:ext cx="${LOGO_EMU}" cy="${LOGO_EMU}"/>
<xdr:pic>
<xdr:nvPicPr><xdr:cNvPr id="1" name="KHI Logo"/><xdr:cNvPicPr/></xdr:nvPicPr>
<xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>
<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${LOGO_EMU}" cy="${LOGO_EMU}"/></a:xfrm><a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom></xdr:spPr>
</xdr:pic>
<xdr:clientData/>
</xdr:oneCellAnchor>
</xdr:wsDr>`
}

function drawingRelsXml(imageExtension) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.${imageExtension}"/>
</Relationships>`
}

function sheetRelsXml(drawingIndex) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${drawingIndex}.xml"/>
</Relationships>`
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
function buildXlsxBlob({ sheets, logo }) {
  const safeSheets = (sheets || []).filter(Boolean)
  if (safeSheets.length === 0) {
    throw new Error('buildXlsxBlob needs at least one sheet')
  }

  // Styles are workbook-global: collect every banner/tint colour pair used by
  // any sheet and hand each worksheet the style ids for its pairs.
  const pairKeys = []
  const groupColorPairs = []
  for (const sheet of safeSheets) {
    for (const group of sheet.archiveHeader?.groups ?? []) {
      const key = `${group.color}|${group.tint}`
      if (group?.color && !pairKeys.includes(key)) {
        pairKeys.push(key)
        groupColorPairs.push({ color: group.color, tint: group.tint })
      }
    }
  }
  const colorStyles = new Map(
    pairKeys.map((key, i) => [key, { banner: 7 + i * 2, title: 8 + i * 2 }]),
  )

  // Logo drawings: one shared image, one drawing part per masthead sheet.
  const imageExtension = detectImageExtension(logo)
  const drawnSheets = imageExtension
    ? safeSheets.map((sheet, i) => (sheet.archiveHeader?.masthead ? i : -1)).filter((i) => i >= 0)
    : []
  const drawingIndexBySheet = new Map(drawnSheets.map((sheetIndex, k) => [sheetIndex, k + 1]))

  const names = sanitizeSheetNames(safeSheets)
  const files = [
    {
      name: '[Content_Types].xml',
      data: contentTypesXml(safeSheets.length, {
        imageExtension: drawnSheets.length ? imageExtension : null,
        drawingCount: drawnSheets.length,
      }),
    },
    { name: '_rels/.rels', data: RELS_XML },
    { name: 'xl/workbook.xml', data: workbookXml(names) },
    { name: 'xl/_rels/workbook.xml.rels', data: workbookRelsXml(safeSheets.length) },
    { name: 'xl/styles.xml', data: stylesXml(groupColorPairs) },
    ...safeSheets.map((sheet, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: worksheetXml({
        columns: sheet.columns || [],
        rows: sheet.rows || [],
        rtl: Boolean(sheet.rtl),
        archiveHeader: sheet.archiveHeader,
        colorStyles,
        drawingRelId: drawingIndexBySheet.has(i) ? 'rId1' : null,
      }),
    })),
  ]

  if (drawnSheets.length) {
    files.push({ name: `xl/media/image1.${imageExtension}`, data: logo })
    for (const sheetIndex of drawnSheets) {
      const drawingIndex = drawingIndexBySheet.get(sheetIndex)
      files.push(
        { name: `xl/drawings/drawing${drawingIndex}.xml`, data: drawingXml() },
        { name: `xl/drawings/_rels/drawing${drawingIndex}.xml.rels`, data: drawingRelsXml(imageExtension) },
        { name: `xl/worksheets/_rels/sheet${sheetIndex + 1}.xml.rels`, data: sheetRelsXml(drawingIndex) },
      )
    }
  }

  return buildZip(files)
}

export { buildXlsxBlob, parseSpreadsheetNumber }
