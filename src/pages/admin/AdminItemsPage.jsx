// Admin "List of Items" page. A thin re-export of the employee page (same
// rationale as AdminProjectPage / AdminPhysicalMediaPage) — the shared page
// derives its section (admin vs employee) from the URL, so collection links
// stay inside the admin area without a separate file.
import { EmployeeItemsPage } from '@/pages/employee/EmployeeItemsPage'

function AdminItemsPage() {
  return <EmployeeItemsPage />
}

export { AdminItemsPage }
