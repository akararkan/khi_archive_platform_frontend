import { Navigate, useSearchParams } from 'react-router-dom'

// Forwards `/public/search?q=…` (the original cross-section search route)
// to `/public/browse?type=audio&q=…`. The browse page hosts the unified
// morph-search sidebar so a user that lands here from a saved link keeps
// their query without seeing a dead page.
function PublicSearchRedirect() {
  const [params] = useSearchParams()
  const q = params.get('q') || ''
  const target = q
    ? `/public/browse?type=audio&q=${encodeURIComponent(q)}`
    : '/public/browse?type=audio'
  return <Navigate to={target} replace />
}

export { PublicSearchRedirect }
