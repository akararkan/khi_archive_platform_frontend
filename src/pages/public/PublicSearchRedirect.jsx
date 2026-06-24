import { Navigate, useSearchParams } from 'react-router-dom'

// Forwards `/public/search?q=…` (the original cross-section search route)
// to `/public/browse?type=all&q=…`. The `all` scope now fans out to the
// four public media get-all endpoints instead of the removed results/feed APIs.
function PublicSearchRedirect() {
  const [params] = useSearchParams()
  const q = params.get('q') || ''
  const target = q
    ? `/public/browse?type=all&q=${encodeURIComponent(q)}`
    : '/public/browse?type=all'
  return <Navigate to={target} replace />
}

export { PublicSearchRedirect }
