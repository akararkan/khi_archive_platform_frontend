import { createBrowserRouter, Navigate } from 'react-router-dom'

import App from '@/App'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { RoleLandingRoute } from '@/components/auth/RoleLandingRoute'
import { RoleRoute } from '@/components/auth/RoleRoute'
import { EmployeeLayout } from '@/components/employee/EmployeeLayout'
import { GuestRoute } from '@/components/auth/GuestRoute'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PublicLayout } from '@/components/public/PublicLayout'
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
import { AdminWarningsPage } from '@/pages/admin/AdminWarningsPage'
import { AdminUserActivityPage } from '@/pages/admin/AdminUserActivityPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { EmployeeProfilePage } from '@/pages/employee/EmployeeProfilePage'
import { EmployeeCategoryPage } from '@/pages/employee/EmployeeCategoryPage'
import { EmployeePersonPage } from '@/pages/employee/EmployeePersonPage'
import { EmployeeProjectPage } from '@/pages/employee/EmployeeProjectPage'
import { EmployeeProjectDetailPage } from '@/pages/employee/EmployeeProjectDetailPage'
import { PublicAudioDetailPage } from '@/pages/public/PublicAudioDetailPage'
import { PublicBrowsePage } from '@/pages/public/PublicBrowsePage'
import { PublicCategoryDetailPage } from '@/pages/public/PublicCategoryDetailPage'
import { PublicImageDetailPage } from '@/pages/public/PublicImageDetailPage'
import { PublicPersonDetailPage } from '@/pages/public/PublicPersonDetailPage'
import { PublicProjectDetailPage } from '@/pages/public/PublicProjectDetailPage'
import { PublicSearchRedirect } from '@/pages/public/PublicSearchRedirect'
import { PublicTextDetailPage } from '@/pages/public/PublicTextDetailPage'
import { PublicVideoDetailPage } from '@/pages/public/PublicVideoDetailPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate to="/public" replace />,
      },
      {
        path: 'public',
        element: <PublicLayout />,
        children: [
          // The single unified browse experience IS the public landing.
          // The sidebar's type rail (and the `?type=` URL param) switches
          // between projects, persons, categories, audios, videos, texts
          // and images — there's no separate "home" or top tabs.
          // `/public` and `/public/browse` both render the same component
          // so existing deep-links with query strings keep working
          // without a redirect (which would drop the search params).
          { index: true, element: <PublicBrowsePage /> },
          { path: 'browse', element: <PublicBrowsePage /> },
          // Legacy /public/search keeps old links alive.
          { path: 'search', element: <PublicSearchRedirect /> },
          // Legacy collection paths redirect into the unified browse so
          // links saved before this consolidation still work.
          { path: 'projects', element: <Navigate to="/public/browse?type=project" replace /> },
          { path: 'categories', element: <Navigate to="/public/browse?type=category" replace /> },
          { path: 'persons', element: <Navigate to="/public/browse?type=person" replace /> },
          { path: 'audios', element: <Navigate to="/public/browse?type=audio" replace /> },
          { path: 'videos', element: <Navigate to="/public/browse?type=video" replace /> },
          { path: 'texts', element: <Navigate to="/public/browse?type=text" replace /> },
          { path: 'images', element: <Navigate to="/public/browse?type=image" replace /> },
          // Detail pages stay individual — every card links to one of these.
          { path: 'projects/:code', element: <PublicProjectDetailPage /> },
          { path: 'categories/:code', element: <PublicCategoryDetailPage /> },
          { path: 'persons/:code', element: <PublicPersonDetailPage /> },
          { path: 'audios/:code', element: <PublicAudioDetailPage /> },
          { path: 'videos/:code', element: <PublicVideoDetailPage /> },
          { path: 'texts/:code', element: <PublicTextDetailPage /> },
          { path: 'images/:code', element: <PublicImageDetailPage /> },
        ],
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
                    path: 'warnings',
                    element: <AdminWarningsPage />,
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
