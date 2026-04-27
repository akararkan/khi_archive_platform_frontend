import { AdminEntityPage } from '@/components/admin/AdminEntityPage'
import { Card, CardContent } from '@/components/ui/card'

function AdminUsersPage() {
  return (
    <AdminEntityPage title="Users" description="Manage platform accounts from this area.">
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardContent className="px-6 py-8 text-sm text-muted-foreground">
          User management will be added here.
        </CardContent>
      </Card>
    </AdminEntityPage>
  )
}

export { AdminUsersPage }