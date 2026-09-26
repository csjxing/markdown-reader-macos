import { useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { useTranslation } from '../../hooks/useTranslation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Sun,
  Moon,
  Type,
  AlignJustify,
  Maximize,
  Languages
} from 'lucide-react'
import type { Locale } from '../../i18n'

export default function Settings() {
  const { settings, updateSettings, isSettingsOpen, setSettingsOpen } = useStore()
  const { t, locale, setLocale } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isSettingsOpen) return
    const previousFocus = document.activeElement as HTMLElement | null
    panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        setSettingsOpen(false)
      } else if (event.key === 'Tab') {
        const elements = panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')
        if (!elements?.length) return
        const first = elements[0]
        const last = elements[elements.length - 1]
        if (event.shiftKey && (document.activeElement === first || !panelRef.current?.contains(document.activeElement))) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && (document.activeElement === last || !panelRef.current?.contains(document.activeElement))) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      previousFocus?.focus()
    }
  }, [isSettingsOpen, setSettingsOpen])

  const themes = [
    { id: 'light' as const, label: t('settings.themes.light'), icon: Sun },
    { id: 'dark' as const, label: t('settings.themes.dark'), icon: Moon },
    { id: 'sepia' as const, label: t('settings.themes.sepia'), icon: Sun }
  ]

  const fonts = [
    {
      id: 'serif',
      label: t('settings.fontFamilies.serif'),
      preview: '宋体 Songti',
      previewFont: '"Songti SC", "Songti TC", "STSong", serif'
    },
    {
      id: 'sans',
      label: t('settings.fontFamilies.sans'),
      preview: '苹方 PingFang',
      previewFont: '"PingFang SC", "PingFang TC", "PingFang HK", sans-serif'
    },
    {
      id: 'mono',
      label: t('settings.fontFamilies.mono'),
      preview: 'Menlo',
      previewFont: '"Menlo", "Monaco", monospace'
    }
  ]

  const languages: { id: Locale; label: string }[] = [
    { id: 'en', label: 'English' },
    { id: 'zh-CN', label: '简体中文' },
    { id: 'zh-TW', label: '繁體中文' }
  ]

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSettingsOpen(false)}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Settings panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('settings.title')}
            className={`fixed right-0 top-0 h-full w-80 z-50 shadow-xl overflow-y-auto ${
              settings.theme === 'dark'
                ? 'bg-gray-800 text-gray-100'
                : 'bg-white text-gray-900'
            }`}
          >
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-inherit bg-inherit">
              <h2 className="text-lg font-semibold">{t('settings.title')}</h2>
              <button
                aria-label={t('nav.close')}
                onClick={() => setSettingsOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Language */}
              <section>
                <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
                  <Languages className="w-4 h-4" />
                  {t('settings.language')}
                </h3>
                <div className="space-y-2">
                  {languages.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => setLocale(lang.id)}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        locale === lang.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="text-sm font-medium">{lang.label}</div>
                    </button>
                  ))}
                </div>
              </section>

              {/* Theme */}
              <section>
                <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
                  <Sun className="w-4 h-4" />
                  {t('settings.theme')}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => updateSettings({ theme: theme.id })}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                        settings.theme === theme.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <theme.icon className="w-5 h-5" />
                      <span className="text-xs">{theme.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Font family */}
              <section>
                <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
                  <Type className="w-4 h-4" />
                  {t('settings.fontFamily')}
                </h3>
                <div className="space-y-2">
                  {fonts.map((font) => (
                    <button
                      key={font.id}
                      onClick={() => updateSettings({ fontFamily: font.id })}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        settings.fontFamily === font.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="text-sm font-medium">{font.label}</div>
                      <div className="text-xs text-gray-500 mt-1"
                        style={{ fontFamily: font.previewFont }}
                      >
                        {font.preview}
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              {/* Font size */}
              <section>
                <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
                  <Type className="w-4 h-4" />
                  {t('settings.fontSize')}: {settings.fontSize}px
                </h3>
                <input
                  type="range"
                  min={14}
                  max={28}
                  step={1}
                  value={settings.fontSize}
                  onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>14px</span>
                  <span>28px</span>
                </div>
              </section>

              {/* Line height */}
              <section>
                <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
                  <AlignJustify className="w-4 h-4" />
                  {t('settings.lineHeight')}: {settings.lineHeight}
                </h3>
                <input
                  type="range"
                  min={1.4}
                  max={2.6}
                  step={0.1}
                  value={settings.lineHeight}
                  onChange={(e) => updateSettings({ lineHeight: Number(e.target.value) })}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{t('settings.compact')}</span>
                  <span>{t('settings.relaxed')}</span>
                </div>
              </section>

              {/* Page width */}
              <section>
                <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
                  <Maximize className="w-4 h-4" />
                  {t('settings.pageWidth')}: {settings.pageWidth}px
                </h3>
                <input
                  type="range"
                  min={500}
                  max={1000}
                  step={20}
                  value={settings.pageWidth}
                  onChange={(e) => updateSettings({ pageWidth: Number(e.target.value) })}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{t('settings.pageWidths.narrow')}</span>
                  <span>{t('settings.pageWidths.wide')}</span>
                </div>
              </section>

            </div>

            {/* Keyboard shortcuts */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium mb-3">{t('settings.shortcuts')}</h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>{t('shortcuts.prevPage')}</span>
                  <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">← / ↑</kbd>
                </div>
                <div className="flex justify-between">
                  <span>{t('shortcuts.nextPage')}</span>
                  <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">→ / ↓ / Space</kbd>
                </div>
                <div className="flex justify-between">
                  <span>{t('shortcuts.toggleToc')}</span>
                  <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">T</kbd>
                </div>
                <div className="flex justify-between">
                  <span>{t('shortcuts.toggleSettings')}</span>
                  <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">S</kbd>
                </div>
                <div className="flex justify-between">
                  <span>{t('shortcuts.back')}</span>
                  <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Esc</kbd>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}