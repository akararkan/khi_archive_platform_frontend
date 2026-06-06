import React from 'react'
import { Outlet } from 'react-router-dom'

import '@/styles/khi-archive.css'
import '@/styles/khi-theme.css'
import KhiRibbon from '@/components/khi/KhiRibbon'
import KhiHeader from '@/components/khi/KhiHeader'
import KhiFooter from '@/components/khi/KhiFooter'

// The public "Living Archive" shell: one RTL .khi-root wrapper (so the scoped
// design system, paper background and Sorani fonts apply) holding the ribbon,
// sticky header, the routed page, and the footer.
export function KhiPublicLayout() {
  return (
    <div className="khi-root" dir="rtl" lang="ckb">
      <KhiRibbon />
      <KhiHeader />
      <Outlet />
      <KhiFooter />
    </div>
  )
}

export default KhiPublicLayout
