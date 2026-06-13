import React from 'react'
import { Outlet } from 'react-router-dom'

import '@/styles/khi-archive.css'
import '@/styles/khi-theme.css'
import KhiHeader from '@/components/khi/KhiHeader'

// The public "Living Archive" shell: one RTL .khi-root wrapper so the scoped
// design system, paper background and Sorani fonts apply. Page-specific hero
// and catalogue sections live in the routed views.
export function KhiPublicLayout() {
  return (
    <div className="khi-root" dir="rtl" lang="ckb">
      <KhiHeader />
      <Outlet />
    </div>
  )
}

export default KhiPublicLayout
