import { Navigate, useSearchParams } from 'react-router-dom'

// Forwards `/public/search?q=…` (the original cross-section search route)
// to `/public/browse?type=all&q=…`. The unified `all` scope hits the
// `/api/guest/results` endpoint, which is the closest match to what the
// old global-search page promised — one ranked feed across audio, video,
// text and image.
function PublicSearchRedirect() {
  const [params] = useSearchParams()
  const q = params.get('q') || ''
  const target = q
    ? `/public/browse?type=all&q=${encodeURIComponent(q)}`
    : '/public/browse?type=all'
  return <Navigate to={target} replace />
}

export { PublicSearchRedirect }
