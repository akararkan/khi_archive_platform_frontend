import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { AppearanceProvider } from '@/lib/appearance-provider'
import { ToastProvider } from '@/components/ui/toaster'
import { router } from '@/router'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppearanceProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AppearanceProvider>
  </StrictMode>,
)
