// i18n configuration
import { en, type Translations } from './en'
import { zhCN } from './zh-CN'
import { zhTW } from './zh-TW'

export type Locale = 'en' | 'zh-CN' | 'zh-TW'

export const translations: Record<Locale, Translations> = {
  en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
}

// Check if a locale string is valid
function isValidLocale(locale: string): boolean {
  return ['en', 'zh-CN', 'zh-TW'].includes(locale)
}

// Detect system language and map to supported locale
function detectSystemLocale(): Locale {
  if (typeof window === 'undefined') {
    return 'zh-CN' // Default to Chinese
  }

  const browserLang = navigator.language || (navigator as any).userLanguage

  if (browserLang) {
    // Map browser language to supported locales
    // Traditional Chinese: zh-TW, zh-HK, zh-Hant
    if (browserLang.startsWith('zh-TW') || browserLang.startsWith('zh-HK') || browserLang.startsWith('zh-Hant')) {
      return 'zh-TW'
    }
    // Simplified Chinese: zh-CN, zh-Hans, zh (fallback to simplified)
    if (browserLang.startsWith('zh-CN') || browserLang.startsWith('zh-Hans') || browserLang.startsWith('zh')) {
      return 'zh-CN'
    }
    // English: en-*, en
    if (browserLang.startsWith('en')) {
      return 'en'
    }
  }

  // Fallback to Chinese (Simplified) if no match
  return 'zh-CN'
}

// Get initial locale from store settings or detect from system
// This is called from useTranslation hook with the store's locale
export function getInitialLocale(storedLocale?: Locale | null): Locale {
  // If there's a stored locale in settings, use it
  if (storedLocale && isValidLocale(storedLocale)) {
    return storedLocale
  }

  // Otherwise detect from system
  return detectSystemLocale()
}

// Simple template interpolation
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{{${key}}}`
  })
}

// Get nested value from object using dot notation
function getNestedValue(obj: any, path: string): string | undefined {
  const keys = path.split('.')
  let current = obj
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key]
    } else {
      return undefined
    }
  }
  return typeof current === 'string' ? current : undefined
}

// Translation function
export function t(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const translation = translations[locale] || translations.en
  const text = getNestedValue(translation, key)

  if (text === undefined) {
    console.warn(`Translation not found: ${key}`)
    return key
  }

  return interpolate(text, params)
}

// Create a bound translation function for a specific locale
export function createTranslator(locale: Locale) {
  return (key: string, params?: Record<string, string | number>) => t(locale, key, params)
}

// Export translations for direct access
export { en, zhCN, zhTW }
export type { Translations }