import { createBrowserRouter, Navigate } from 'react-router-dom'

import App from '@/App'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { RoleLandingRoute } from '@/components/auth/RoleLandingRoute'
import { RoleRoute } from '@/components/auth/RoleRoute'
import { EmployeeLayout } from '@/components/employee/EmployeeLayout'
import { TeacherLayout } from '@/components/teacher/TeacherLayout'
import { GuestRoute } from '@/components/auth/GuestRoute'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { KhiPublicLayout } from '@/components/public/KhiPublicLayout'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { AdminAnalyticsPage } from '@/pages/admin/AdminAnalyticsPage'
import { AdminCategoryPage } from '@/pages/admin/AdminCategoryPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminItemsPage } from '@/pages/admin/AdminItemsPage'
import { AdminMaqamPage } from '@/pages/admin/AdminMaqamPage'
import { AdminPersonPage } from '@/pages/admin/AdminPersonPage'
import { AdminPhysicalMediaPage } from '@/pages/admin/AdminPhysicalMediaPage'
import { AdminProfilePage } from '@/pages/admin/AdminProfilePage'
import { AdminProjectDetailPage } from '@/pages/admin/AdminProjectDetailPage'
import { AdminProjectPage } from '@/pages/admin/AdminProjectPage'
import { AdminRolesPage } from '@/pages/admin/AdminRolesPage'
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage'
import { AdminTrashPage } from '@/pages/admin/AdminTrashPage'
import { AdminCorrectionsPage } from '@/pages/admin/AdminCorrectionsPage'
import { AdminWarningsPage } from '@/pages/admin/AdminWarningsPage'
import { AdminUserActivityPage } from '@/pages/admin/AdminUserActivityPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { EmployeeCorrectionsPage } from '@/pages/employee/EmployeeCorrectionsPage'
import { EmployeeItemsPage } from '@/pages/employee/EmployeeItemsPage'
import { EmployeeMaqamPage } from '@/pages/employee/EmployeeMaqamPage'
import { EmployeeProfilePage } from '@/pages/employee/EmployeeProfilePage'
import { EmployeeCategoryPage } from '@/pages/employee/EmployeeCategoryPage'
import { EmployeePersonPage } from '@/pages/employee/EmployeePersonPage'
import { EmployeePhysicalMediaPage } from '@/pages/employee/EmployeePhysicalMediaPage'
import { EmployeeProjectPage } from '@/pages/employee/EmployeeProjectPage'
import { EmployeeProjectDetailPage } from '@/pages/employee/EmployeeProjectDetailPage'
import { PublicAudioDetailPage } from '@/pages/public/PublicAudioDetailPage'
import { KhiBrowsePage } from '@/pages/public/KhiBrowsePage'
import { PublicCategoryDetailPage } from '@/pages/public/PublicCategoryDetailPage'
import { PublicImageDetailPage } from '@/pages/public/PublicImageDetailPage'
import { PublicPersonDetailPage } from '@/pages/public/PublicPersonDetailPage'
import { PublicProjectDetailPage } from '@/pages/public/PublicProjectDetailPage'
import { PublicSearchRedirect } from '@/pages/public/PublicSearchRedirect'
import { PublicTextDetailPage } from '@/pages/public/PublicTextDetailPage'
import { PublicVideoDetailPage } from '@/pages/public/PublicVideoDetailPage'
import { TeacherMaqamDetailPage } from '@/pages/teacher/TeacherMaqamDetailPage'
import { TeacherMaqamListPage } from '@/pages/teacher/TeacherMaqamListPage'
import { TeacherRecentPage } from '@/pages/teacher/TeacherRecentPage'

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
        path: 'translate',
        element: <Navigate to="/public#translate" replace />,
      },
      {
        path: 'public',
        element: <KhiPublicLayout />,
        children: [
          // The single unified browse experience IS the public landing.
          // The sidebar's type rail (and the `?type=` URL param) switches
          // between projects, persons, categories, audios, videos, texts
          // and images — there's no separate "home" or top tabs.
          // `/public` and `/public/browse` both render the same component
          // so existing deep-links with query strings keep working
          // without a redirect (which would drop the search params).
          { index: true, element: <KhiBrowsePage /> },
          { path: 'browse', element: <KhiBrowsePage /> },
          // Legacy /public/search keeps old links alive.
          { path: 'search', element: <PublicSearchRedirect /> },
          // Legacy collection paths redirect into the unified browse so
          // links saved before this consolidation still work.
          { path: 'projects', element: <Navigate to="/public/browse?type=project" replace /> },
          { path: 'categories', element: <Navigate to="/public/browse?type=category" replace /> },
          { path: 'persons', element: <Navigate to="/public/browse?type=person" replace /> },
          { path: 'audios', element: <Navigate to="/public/browse?types=audio" replace /> },
          { path: 'videos', element: <Navigate to="/public/browse?types=video" replace /> },
          { path: 'texts', element: <Navigate to="/public/browse?types=text" replace /> },
          { path: 'images', element: <Navigate to="/public/browse?types=image" replace /> },
          { path: 'translate', element: <Navigate to="/public#translate" replace /> },
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
            // Legacy guest account page removed. Preserve old deep links by
            // redirecting /account back to the public catalogue.
            path: 'account',
            element: <Navigate to="/public" replace />,
          },
          {
            element: <RoleRoute allowedRole="employee" />,
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
                  {
                    path: 'items',
                    element: <EmployeeItemsPage />,
                  },
                  {
                    path: 'maqam',
                    element: <EmployeeMaqamPage />,
                  },
                  {
                    path: 'physical-media',
                    element: <EmployeePhysicalMediaPage />,
                  },
                  {
                    path: 'corrections',
                    element: <EmployeeCorrectionsPage />,
                  },
                ],
              },
            ],
          },
          {
            element: <RoleRoute allowedRole="admin" />,
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
                    path: 'items',
                    element: <AdminItemsPage />,
                  },
                  {
                    path: 'maqam',
                    element: <AdminMaqamPage />,
                  },
                  {
                    path: 'physical-media',
                    element: <AdminPhysicalMediaPage />,
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
                    path: 'corrections',
                    element: <AdminCorrectionsPage />,
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
          {
            // Teachers only ever see their assigned maqam records — a single,
            // right-to-left Kurdish workspace.
            element: <RoleRoute allowedRole="teacher" />,
            children: [
              {
                path: 'teacher',
                element: <TeacherLayout />,
                children: [
                  {
                    index: true,
                    element: <TeacherMaqamListPage />,
                  },
                  {
                    path: 'recent',
                    element: <TeacherRecentPage />,
                  },
                  {
                    path: 'maqam/:code',
                    element: <TeacherMaqamDetailPage />,
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
