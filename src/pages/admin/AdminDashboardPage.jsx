import { AdminEntityPage } from '@/components/admin/AdminEntityPage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const dashboardCards = [
  {
    title: 'Users',
    description: 'Create, review, and manage account access.',
  },
  {
    title: 'Roles',
    description: 'Keep permissions organized across the platform.',
  },
  {
    title: 'Settings',
    description: 'Tune the administrative defaults and preferences.',
  },
]

function AdminDashboardPage() {
  return (
    <AdminEntityPage title="Dashboard" description="A simple starting point for admin operations.">
      <div className="grid gap-4 md:grid-cols-3">
        {dashboardCards.map((item) => (
          <Card key={item.title} className="border-border bg-card shadow-sm shadow-black/5">
            <CardHeader className="space-y-2">
              <CardTitle className="text-lg font-semibold">{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">This section is ready for the next admin workflow.</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminEntityPage>
  )
}

export { AdminDashboardPage }