// Walks a Spring `Page<DTO>` endpoint until the last page and returns every
// record — the "Excel holds the REAL records" half of the export feature.
// Works with any of this codebase's `getXxxPage({ page, size })` services;
// plain-array responses (non-paginated endpoints) pass through in one step.
//
// The cap exists so one click can't accidentally pull an unbounded table at
// 30TB-archive scale; callers surface `truncated` to the user when it trips.

const EXPORT_PAGE_SIZE = 200
const EXPORT_MAX_RECORDS = 20000

async function fetchAllPageRecords(
  fetchPage,
  { size = EXPORT_PAGE_SIZE, maxRecords = EXPORT_MAX_RECORDS } = {},
) {
  const records = []
  let page = 0
  let truncated = false

  for (;;) {
    const data = await fetchPage({ page, size })
    const isPageShape = Boolean(data) && typeof data === 'object' && Array.isArray(data.content)
    const content = isPageShape ? data.content : Array.isArray(data) ? data : []
    records.push(...content)

    if (records.length > maxRecords) {
      records.length = maxRecords
      truncated = true
      break
    }

    const totalPages = Number(data?.totalPages)
    const isLast =
      !isPageShape ||
      data.last === true ||
      content.length < size ||
      (Number.isFinite(totalPages) && page >= totalPages - 1)
    if (isLast) break
    page += 1
  }

  return { records, truncated }
}

export { EXPORT_MAX_RECORDS, fetchAllPageRecords }
