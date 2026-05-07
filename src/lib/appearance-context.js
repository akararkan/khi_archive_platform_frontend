// Context + hook for the appearance store. Lives in its own .js file
// (no JSX, no components) so HMR fast-refresh works on the provider
// file without complaining about non-component exports.

import { createContext, useContext } from 'react'

export const AppearanceContext = createContext(null)

export function useAppearance() {
  const ctx = useContext(AppearanceContext)
  if (!ctx) {
    throw new Error('useAppearance() must be used inside <AppearanceProvider>')
  }
  return ctx
}
