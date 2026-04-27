import { AdminEntityPage } from '@/components/admin/AdminEntityPage'
import { Card, CardContent } from '@/components/ui/card'

function AdminRolesPage() {
  return (
    <AdminEntityPage title="Roles" description="Define and review access levels.">
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardContent className="px-6 py-8 text-sm text-muted-foreground">
          Role management will be added here.
        </CardContent>
      </Card>
    </AdminEntityPage>
  )
}

export { AdminRolesPage }