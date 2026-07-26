import { useEffect } from 'react'

import { clearReportExportProvider, setReportExportProvider } from '@/lib/report-export-store'

// Registers this page's Excel-export provider (see lib/report-export-store.js)
// for as long as the page is mounted. Pass the same deps you would give
// useCallback — the provider closure is re-registered when they change so it
// always sees the current search/filter/tab state.
export function useReportExport(provider, deps) {
  useEffect(() => {
    setReportExportProvider(provider)
    return () => clearReportExportProvider(provider)
    // The caller owns the dependency list, exactly like useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
