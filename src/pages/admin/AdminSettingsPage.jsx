import { AdminEntityPage } from '@/components/admin/AdminEntityPage'
import { KhiLogoManager } from '@/components/admin/KhiLogoManager'

function AdminSettingsPage() {
  return (
    <AdminEntityPage
      title="Settings"
      description="Platform branding, behavior, and defaults."
    >
      <KhiLogoManager />
    </AdminEntityPage>
  )
}

export { AdminSettingsPage }
