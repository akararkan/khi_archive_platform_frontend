// Column-profiling engine behind the "Excel + statistics" export.
//
// Takes the plain data extracted from an admin/employee table
// ({ columns: string[], rows: string[][] }) and answers, per column: how
// filled is it, how many distinct values, what are the most common ones, and
// — when the column is numeric — min/avg/max. The printed statistical report
// and the workbook's "Column statistics" sheet both render from this one
// profile, so the numbers can never disagree.

import { parseSpreadsheetNumber } from '@/lib/xlsx-writer'

// A column counts as numeric when ≥85% of its filled cells parse as numbers —
// tolerant of the odd "N/A" without misclassifying mixed text columns.
const NUMERIC_COLUMN_THRESHOLD = 0.85

// ISO-8601 date / datetime (the backend's audit + date fields). For this
// shape lexicographic order equals chronological order, so the column's
// range (earliest → latest) falls out of plain string comparison.
const DATE_VALUE_RE = /^\d{4}-\d{2}-\d{2}([T ].*)?$/

// Above this average length a column reads as prose (descriptions, notes):
// top-value chips are meaningless there, so the report shows length info.
const LONG_TEXT_AVG_LENGTH = 60

// How many of the most common values each profile carries. The profile table
// shows the first 3; distribution cards show up to 6 (+ "other").
const TOP_VALUES_KEPT = 8

function computeTableStatistics({ columns, rows }) {
  const rowCount = rows.length
  let filledCells = 0

  const profiles = columns.map((name, columnIndex) => {
    const counts = new Map()
    let filled = 0
    let totalLength = 0
    let numericCount = 0
    let min = Infinity
    let max = -Infinity
    let sum = 0
    let dateCount = 0
    let dateMin = ''
    let dateMax = ''

    for (const row of rows) {
      const value = String(row[columnIndex] ?? '').trim()
      if (!value) continue

      filled += 1
      totalLength += value.length
      counts.set(value, (counts.get(value) || 0) + 1)

      const numeric = parseSpreadsheetNumber(value)
      if (numeric != null) {
        const parsed = Number(numeric)
        numericCount += 1
        if (parsed < min) min = parsed
        if (parsed > max) max = parsed
        sum += parsed
      } else if (DATE_VALUE_RE.test(value)) {
        dateCount += 1
        if (!dateMin || value < dateMin) dateMin = value
        if (!dateMax || value > dateMax) dateMax = value
      }
    }

    filledCells += filled

    const distinct = counts.size
    const avgLength = filled ? totalLength / filled : 0
    const isNumeric = filled > 0 && numericCount / filled >= NUMERIC_COLUMN_THRESHOLD
    const isDates = !isNumeric && filled > 0 && dateCount / filled >= NUMERIC_COLUMN_THRESHOLD
    const allUnique = filled > 1 && distinct === filled
    const longText = !isNumeric && !isDates && avgLength > LONG_TEXT_AVG_LENGTH

    const topValues =
      allUnique || longText || isDates
        ? []
        : [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, TOP_VALUES_KEPT)
            .map(([value, count]) => ({
              value,
              count,
              share: filled ? count / filled : 0,
            }))

    return {
      name,
      filled,
      fillRate: rowCount ? filled / rowCount : 0,
      distinct,
      allUnique,
      longText,
      avgLength,
      numeric: isNumeric ? { min, max, mean: sum / numericCount } : null,
      dates: isDates ? { min: dateMin, max: dateMax } : null,
      topValues,
    }
  })

  const totalCells = rowCount * columns.length

  return {
    rowCount,
    columnCount: columns.length,
    filledCells,
    totalCells,
    completeness: totalCells ? filledCells / totalCells : 0,
    profiles,
  }
}

// Columns worth a value-distribution card in the printed report: real
// categories (a handful of repeated values), reasonably filled. Ranked so the
// most complete, most category-like columns win the limited page space.
function pickDistributionColumns(statistics, limit = 4) {
  return statistics.profiles
    .filter(
      (profile) =>
        !profile.numeric &&
        !profile.dates &&
        !profile.allUnique &&
        !profile.longText &&
        profile.distinct >= 2 &&
        profile.distinct <= 12 &&
        profile.fillRate >= 0.4,
    )
    .sort(
      (a, b) =>
        b.fillRate * (1 - b.distinct / 20) - a.fillRate * (1 - a.distinct / 20),
    )
    .slice(0, limit)
}

export { computeTableStatistics, pickDistributionColumns }
