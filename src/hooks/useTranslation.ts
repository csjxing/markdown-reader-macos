import { useStore } from '../store'
import { createTranslator, getInitialLocale } from '../i18n'
import { useEffect, useMemo } from 'react'
import type { Locale } from '../i18n'

/**
 * Hook to get translation function and current locale
 * Automatically syncs locale with store settings
 *
 * Behavior:
 * - If settings.locale is set (user previously selected), use it
 * - Otherwise, detect from system language
 * - If no system language match, default to Chinese (Simplified)
 */
export function useTranslation() {
  const settings = useStore((state) => state.settings)
  const updateSettings = useStore((state) => state.updateSettings)

  // Determine the effective locale
  const locale = useMemo(() => {
    return getInitialLocale(settings.locale)
  }, [settings.locale])

  const t = useMemo(() => createTranslator(locale), [locale])

  // Initialize locale in store if not set
  useEffect(() => {
    if (!settings.locale) {
      updateSettings({ locale })
    }
  }, [settings.locale, locale, updateSettings])

  return {
    t,
    locale,
    setLocale: (newLocale: string) => updateSettings({ locale: newLocale as Locale })
  }
}

/**
 * Hook for locale only (lighter weight when you just need the locale)
 */
export function useLocale() {
  const settings = useStore((state) => state.settings)
  const updateSettings = useStore((state) => state.updateSettings)

  const locale = useMemo(() => {
    return getInitialLocale(settings.locale)
  }, [settings.locale])

  // Initialize locale in store if not set
  useEffect(() => {
    if (!settings.locale) {
      updateSettings({ locale })
    }
  }, [settings.locale, locale, updateSettings])

  return {
    locale,
    setLocale: (newLocale: string) => updateSettings({ locale: newLocale as Locale })
  }
}