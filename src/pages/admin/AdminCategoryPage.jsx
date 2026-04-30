// Admin Category page. Currently a thin re-export of the employee page so
// the underlying behavior stays in one place — but having a separate file
// + route means admin-specific divergences (different toolbar actions,
// extra columns, audit-only views, etc.) can land here without touching
// the employee version.
import { EmployeeCategoryPage } from '@/pages/employee/EmployeeCategoryPage'

function AdminCategoryPage() {
  return <EmployeeCategoryPage />
}

export { AdminCategoryPage }
