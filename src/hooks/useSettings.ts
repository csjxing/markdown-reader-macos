import { useCallback, useEffect } from 'react'
import { useStore, ReaderSettings } from '../store'

export function useSettings() {
  const { settings, updateSettings } = useStore()

  const setTheme = useCallback(
    (theme: ReaderSettings['theme']) => {
      updateSettings({ theme })

      // Apply theme to document
      const root = document.documentElement
      if (theme === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    },
    [updateSettings]
  )

  const setFontSize = useCallback(
    (fontSize: number) => {
      updateSettings({ fontSize })
    },
    [updateSettings]
  )

  const setLineHeight = useCallback(
    (lineHeight: number) => {
      updateSettings({ lineHeight })
    },
    [updateSettings]
  )

  const setFontFamily = useCallback(
    (fontFamily: string) => {
      updateSettings({ fontFamily })
    },
    [updateSettings]
  )

  const setPageWidth = useCallback(
    (pageWidth: number) => {
      updateSettings({ pageWidth })
    },
    [updateSettings]
  )

  const setFlipMode = useCallback(
    (flipMode: ReaderSettings['flipMode']) => {
      updateSettings({ flipMode })
    },
    [updateSettings]
  )

  const toggleDarkMode = useCallback(() => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
  }, [settings.theme, setTheme])

  // Apply dark mode on mount and when theme changes
  useEffect(() => {
    const root = document.documentElement
    if (settings.theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [settings.theme])

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      if (settings.theme === 'light' || settings.theme === 'dark') {
        // Only auto-switch if not using sepia
        if (!localStorage.getItem('markdown-reader-theme-manual')) {
          setTheme(e.matches ? 'dark' : 'light')
        }
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [settings.theme, setTheme])

  return {
    settings,
    setTheme,
    setFontSize,
    setLineHeight,
    setFontFamily,
    setPageWidth,
    setFlipMode,
    toggleDarkMode
  }
}