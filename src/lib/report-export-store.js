// Bridge between list pages and the report toolbar's "Excel + statistics"
// button (AdminPrintManager). A mounted page registers an async provider that
// returns the REAL records — full DTOs with every field, covering the whole
// matching result set, not just the rows/columns rendered in its table. The
// manager flattens those into workbook sheets; pages without a provider fall
// back to a DOM scrape of the visible table.
//
// Provider contract:
//   async () => ({
//     sections: [{ title, records, labels?, omit? }],  // records: object[]
//     truncated?: boolean,                              // hit the export cap
//   })
// Returning null/undefined (or no sections) falls back to the DOM scrape.
//
// Only one page is mounted in the dashboard Outlet at a time, so a single
// slot suffices; unmount clears it (guarded so a late cleanup from the old
// page can't wipe the provider the next page just registered).

let currentProvider = null

function setReportExportProvider(provider) {
  currentProvider = provider
}

function clearReportExportProvider(provider) {
  if (currentProvider === provider) currentProvider = null
}

function getReportExportProvider() {
  return currentProvider
}

export { clearReportExportProvider, getReportExportProvider, setReportExportProvider }
