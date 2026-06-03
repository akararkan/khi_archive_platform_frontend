// Admin Physical-media page. A thin re-export of the employee page (same
// rationale as AdminCategoryPage) — the shared page already lights up the
// admin-only trash tab + soft-delete / restore / purge controls via
// useIsAdmin(), so admins get the extra surface without a separate file.
import { EmployeePhysicalMediaPage } from '@/pages/employee/EmployeePhysicalMediaPage'

function AdminPhysicalMediaPage() {
  return <EmployeePhysicalMediaPage />
}

export { AdminPhysicalMediaPage }
