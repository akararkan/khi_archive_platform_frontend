import { useEffect, useState } from 'react'

import {
  KHI_LOGO_FALLBACK_SRC,
  ensureActiveKhiLogo,
  getActiveKhiLogo,
  resolveKhiLogoSrc,
  subscribeKhiLogo,
} from '@/lib/khi-logo'

// Subscribes to the uploaded site logo. Any component that renders the brand
// mark triggers the (deduped) fetch, so no layout has to remember to prime it.
export function useKhiLogo() {
  const [record, setRecord] = useState(() => getActiveKhiLogo())

  useEffect(() => {
    const unsubscribe = subscribeKhiLogo(setRecord)
    ensureActiveKhiLogo().catch(() => {})
    return unsubscribe
  }, [])

  return record
}

// The `src` to draw right now: the uploaded logo when there is one, otherwise
// the file bundled with the app.
export function useKhiLogoSrc() {
  const record = useKhiLogo()
  return record ? resolveKhiLogoSrc(record) : KHI_LOGO_FALLBACK_SRC
}
