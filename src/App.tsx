import { lazy, Suspense, useEffect } from 'react'
import { useStore } from './store'
import { t } from './i18n'
import Bookshelf from './pages/Bookshelf'
import Navbar from './components/common/Navbar'
import Settings from './components/reader/Settings'

// The library can become interactive without parsing the document/editor stack.
const Reader = lazy(() => import('./pages/Reader'))

function App() {
  const currentBook = useStore((state) => state.currentBook)
  const settings = useStore((state) => state.settings)

  // Apply theme
  useEffect(() => {
    const root = document.documentElement
    if (settings.theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [settings.theme])

  // Closing a document window must not silently discard an unsaved edit.
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const { hasUnsavedChanges, settings } = useStore.getState()
      if (!hasUnsavedChanges) return
      if (window.electronAPI && window.confirm(t(settings.locale, 'editor.closeUnsaved'))) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // Setup Electron event listeners - only once
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI) {
      console.log('[App] Not in Electron environment')
      return
    }

    // File import listener
    const unsubFiles = window.electronAPI.onFilesImported((files) => {
      const { addBooks, openBookWithContent } = useStore.getState()
      const imported = addBooks(files.map(file => ({
        title: file.path.split(/[\\/]/).pop()?.replace(/\.(md|markdown|txt)$/i, '') || 'Untitled',
        path: file.path,
        lastRead: new Date().toISOString(),
        progress: 0,
        wordCount: file.content.length,
      })))
      // Import a folder in one state update, preserving an active edit.
      if (files.length === 1 && imported[0] && !useStore.getState().hasUnsavedChanges && !useStore.getState().isSaving) {
        openBookWithContent(imported[0], files[0].content)
      }
    })

    // Dark mode toggle listener
    const unsubDark = window.electronAPI.onToggleDarkMode(() => {
      const { settings, updateSettings } = useStore.getState()
      updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
    })

    // Open settings listener
    const unsubSettings = window.electronAPI.onOpenSettings(() => {
      const { setSettingsOpen } = useStore.getState()
      setSettingsOpen(true)
    })

    // Each effect setup owns its subscriptions, including StrictMode remounts.
    return () => {
      unsubFiles()
      unsubDark()
      unsubSettings()
    }
  }, [])

  if (currentBook) {
    return (
      <div className={`h-screen flex flex-col ${settings.theme === 'dark' ? 'dark' : ''}`}>
        <Suspense fallback={<div role="status" className="m-auto p-8" aria-busy="true">{t(settings.locale, 'reader.loading')}</div>}>
          <Reader />
        </Suspense>
      </div>
    )
  }

  return (
    <div className={`h-screen flex flex-col ${settings.theme === 'dark' ? 'dark' : ''}`}>
      <Navbar />
      <Bookshelf />
      <Settings />
    </div>
  )
}

export default App
