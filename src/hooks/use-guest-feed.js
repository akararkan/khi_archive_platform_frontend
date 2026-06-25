import { useEffect, useState } from 'react'
import fetchGuestFeed from '@/services/guest-feed'

export function useGuestFeed(filters) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchGuestFeed({ ...filters, signal: controller.signal })
        if (!cancelled) setData(res)
      } catch (err) {
        if (!cancelled && err?.name !== 'AbortError') setError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
      controller.abort()
    }
    // We stringify filters so callers can pass a fresh object without
    // refetching unless the contents actually differ. Callers may also
    // memoize filters with useMemo.
  }, [JSON.stringify(filters || {})])

  return { data, loading, error }
}

export default useGuestFeed
