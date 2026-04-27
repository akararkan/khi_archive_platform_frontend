import { AdminEntityPage } from '@/components/admin/AdminEntityPage'
import { Card, CardContent } from '@/components/ui/card'

function AdminSettingsPage() {
  return (
    <AdminEntityPage title="Settings" description="Adjust platform behavior and defaults.">
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardContent className="px-6 py-8 text-sm text-muted-foreground">
          Settings controls will be added here.
        </CardContent>
      </Card>
    </AdminEntityPage>
  )
}

export { AdminSettingsPage }