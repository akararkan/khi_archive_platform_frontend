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
import { AdminAnalyticsPage } from '@/pages/admin/AdminAnalyticsPage'
import { AdminCategoryPage } from '@/pages/admin/AdminCategoryPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminPersonPage } from '@/pages/admin/AdminPersonPage'
import { AdminProfilePage } from '@/pages/admin/AdminProfilePage'
import { AdminProjectDetailPage } from '@/pages/admin/AdminProjectDetailPage'
import { AdminProjectPage } from '@/pages/admin/AdminProjectPage'
import { AdminRolesPage } from '@/pages/admin/AdminRolesPage'
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage'
import { AdminTrashPage } from '@/pages/admin/AdminTrashPage'
import { AdminUserActivityPage } from '@/pages/admin/AdminUserActivityPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { EmployeeProfilePage } from '@/pages/employee/EmployeeProfilePage'
import { EmployeeCategoryPage } from '@/pages/employee/EmployeeCategoryPage'
import { EmployeePersonPage } from '@/pages/employee/EmployeePersonPage'
import { EmployeeProjectPage } from '@/pages/employee/EmployeeProjectPage'
import { EmployeeProjectDetailPage } from '@/pages/employee/EmployeeProjectDetailPage'

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
                    path: 'category',
                    element: <EmployeeCategoryPage />,
                  },
                  {
                    path: 'person',
                    element: <EmployeePersonPage />,
                  },
                  {
                    path: 'project',
                    element: <EmployeeProjectPage />,
                  },
                  {
                    path: 'project/:code',
                    element: <EmployeeProjectDetailPage />,
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
                    path: 'profile',
                    element: <AdminProfilePage />,
                  },
                  {
                    path: 'category',
                    element: <AdminCategoryPage />,
                  },
                  {
                    path: 'person',
                    element: <AdminPersonPage />,
                  },
                  {
                    path: 'project',
                    element: <AdminProjectPage />,
                  },
                  {
                    path: 'project/:code',
                    element: <AdminProjectDetailPage />,
                  },
                  {
                    path: 'trash',
                    element: <AdminTrashPage />,
                  },
                  {
                    path: 'analytics',
                    element: <AdminAnalyticsPage />,
                  },
                  {
                    path: 'analytics/users/:username',
                    element: <AdminUserActivityPage />,
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
