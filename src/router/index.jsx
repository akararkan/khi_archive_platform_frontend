import { createBrowserRouter, Navigate } from 'react-router-dom'

import App from '@/App'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { RoleLandingRoute } from '@/components/auth/RoleLandingRoute'
import { RoleRoute } from '@/components/auth/RoleRoute'
import { EmployeeLayout } from '@/components/employee/EmployeeLayout'
import { GuestRoute } from '@/components/auth/GuestRoute'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminRolesPage } from '@/pages/admin/AdminRolesPage'
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { EmployeeProfilePage } from '@/pages/employee/EmployeeProfilePage'
import { EmployeeAudioPage } from '@/pages/employee/EmployeeAudioPage'
import { EmployeeCategoryPage } from '@/pages/employee/EmployeeCategoryPage'
import { EmployeeObjectPage } from '@/pages/employee/EmployeeObjectPage'
import { EmployeePersonPage } from '@/pages/employee/EmployeePersonPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate to="/login" replace />,
      },
      {
        element: <GuestRoute />,
        children: [
          {
            path: 'login',
            element: <LoginPage />,
          },
          {
            path: 'register',
            element: <RegisterPage />,
          },
          {
            path: 'forgot-password',
            element: <ForgotPasswordPage />,
          },
          {
            path: 'reset-password',
            element: <ResetPasswordPage />,
          },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: 'dashboard',
            element: <RoleLandingRoute />,
          },
          {
            element: <RoleRoute allowedRole="employee" fallbackPath="/admin/dashboard" />,
            children: [
              {
                path: 'employee',
                element: <EmployeeLayout />,
                children: [
                  {
                    index: true,
                    element: <Navigate to="profile" replace />,
                  },
                  {
                    path: 'profile',
                    element: <EmployeeProfilePage />,
                  },
                  {
                    path: 'audio',
                    element: <EmployeeAudioPage />,
                  },
                  {
                    path: 'category',
                    element: <EmployeeCategoryPage />,
                  },
                  {
                    path: 'object',
                    element: <EmployeeObjectPage />,
                  },
                  {
                    path: 'person',
                    element: <EmployeePersonPage />,
                  },
                ],
              },
            ],
          },
          {
            element: <RoleRoute allowedRole="admin" fallbackPath="/employee/profile" />,
            children: [
              {
                path: 'admin',
                element: <AdminLayout />,
                children: [
                  {
                    index: true,
                    element: <Navigate to="dashboard" replace />,
                  },
                  {
                    path: 'dashboard',
                    element: <AdminDashboardPage />,
                  },
                  {
                    path: 'users',
                    element: <AdminUsersPage />,
                  },
                  {
                    path: 'roles',
                    element: <AdminRolesPage />,
                  },
                  {
                    path: 'settings',
                    element: <AdminSettingsPage />,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])

export { router }
