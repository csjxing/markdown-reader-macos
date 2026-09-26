import { useStore } from '../../store'
import { useTranslation } from '../../hooks/useTranslation'
import {
  Menu,
  ArrowLeft,
  Settings
} from 'lucide-react'

interface NavbarProps {
  showBackButton?: boolean
  onBack?: () => void
  title?: string
}

export default function Navbar({ showBackButton, onBack, title }: NavbarProps) {
  const { settings, isSidebarOpen, setSidebarOpen, setSettingsOpen, currentBook } =
    useStore()
  const { t } = useTranslation()
  const hasElectron = typeof window !== 'undefined' && window.electronAPI

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0

  const themeStyles = {
    light: 'bg-white text-gray-900 border-gray-200',
    dark: 'bg-gray-900 text-gray-100 border-gray-700',
    sepia: 'bg-amber-50 text-amber-950 border-amber-200'
  }

  return (
    <nav
      className={`titlebar h-12 flex items-center justify-between border-b ${themeStyles[settings.theme]}`}
    >
      {/* Left section - macOS traffic lights space + buttons */}
      <div className="flex items-center">
        {/* macOS traffic lights placeholder - reserve space for window controls */}
        {hasElectron && isMac && (
          <div className="w-[76px] flex-shrink-0" />
        )}

        {/* Buttons area - with proper spacing */}
        <div className="flex items-center gap-2">
          {showBackButton && (
            <button
              onClick={onBack}
              className={`p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
              title={t('nav.backToBookshelf')}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {showBackButton && currentBook && !title && (
            <span className="text-sm font-medium truncate max-w-[200px]">
              {currentBook.title}
            </span>
          )}
        </div>
      </div>

      {/* Center section - Title */}
      <div className="flex items-center absolute left-1/2 -translate-x-1/2">
        <span className="text-sm font-medium">
          {title || t('app.name')}
        </span>
      </div>

      {/* Right section */}
      <div className="flex items-center">
        {(
          <button
            onClick={() => setSettingsOpen(true)}
            className={`p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
            title={t('actions.settings')}
          >
            <Settings className="w-4 h-4" />
          </button>
        )}

        {/* Sidebar toggle button - only on bookshelf page, at the far right */}
        {!showBackButton && (
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className={`p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors mr-2`}
            title={t('actions.toggleSidebar')}
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
      </div>
    </nav>
  )
}