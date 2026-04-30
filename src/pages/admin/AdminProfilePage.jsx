// Admin Profile page. Same wrapper pattern as the other Admin* pages —
// behavior lives in EmployeeProfilePage today, but having a separate file
// + /admin/profile route lets admin diverge later (e.g. extra audit fields,
// admin-only actions) without forking the employee version.
import { EmployeeProfilePage } from '@/pages/employee/EmployeeProfilePage'

function AdminProfilePage() {
  return <EmployeeProfilePage />
}

export { AdminProfilePage }
