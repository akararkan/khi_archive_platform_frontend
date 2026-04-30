// Admin Person page. See AdminCategoryPage for the rationale behind the
// thin wrapper — a dedicated file gives admin its own surface to diverge
// on without forcing the change through the employee page.
import { EmployeePersonPage } from '@/pages/employee/EmployeePersonPage'

function AdminPersonPage() {
  return <EmployeePersonPage />
}

export { AdminPersonPage }
