const SYSTEM_DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

function applySystemTheme(isDarkMode) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.classList.toggle('dark', isDarkMode)
  document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light'
}

function syncThemeWithSystem() {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const mediaQuery = window.matchMedia(SYSTEM_DARK_MEDIA_QUERY)
  applySystemTheme(mediaQuery.matches)

  const onChange = (event) => {
    applySystemTheme(event.matches)
  }

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }

  mediaQuery.addListener(onChange)
  return () => mediaQuery.removeListener(onChange)
}

export { syncThemeWithSystem }
