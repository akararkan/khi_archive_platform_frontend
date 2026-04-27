import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { ToastProvider } from '@/components/ui/toaster'
import { syncThemeWithSystem } from '@/lib/system-theme'
import { router } from '@/router'

syncThemeWithSystem()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  </StrictMode>,
)
