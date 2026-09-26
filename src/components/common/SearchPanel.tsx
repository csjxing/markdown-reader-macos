import { useEffect, useRef, useCallback } from 'react'
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from '../../hooks/useTranslation'

interface SearchPanelProps {
  isOpen: boolean
  onClose: () => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  currentIndex: number
  totalResults: number
  onNext: () => void
  onPrev: () => void
  theme?: 'light' | 'dark' | 'sepia'
}

export default function SearchPanel({
  isOpen,
  onClose,
  searchQuery,
  onSearchQueryChange,
  currentIndex,
  totalResults,
  onNext,
  onPrev,
  theme = 'light'
}: SearchPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { t } = useTranslation()

  // Auto-focus and select all when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      // Select all text when search opens
      inputRef.current.select()
    }
  }, [isOpen])

  // Handle keyboard shortcuts - use native event for proper propagation control
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const nativeEvent = e.nativeEvent

    // Cmd/Ctrl+A - Select all (MUST let browser handle)
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
      // Don't prevent default, don't stop propagation
      return
    }

    // Cmd/Ctrl+C/V/X - Clipboard operations (let browser handle)
    if ((e.metaKey || e.ctrlKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
      return
    }

    // Enter - Navigate to next/prev result
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      nativeEvent.stopImmediatePropagation()
      if (e.shiftKey) {
        onPrev()
      } else {
        onNext()
      }
      return
    }

    // Escape - Close search
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      nativeEvent.stopImmediatePropagation()
      onClose()
      return
    }

    // For other keys, stop propagation to prevent global shortcuts
    // but use native stopImmediatePropagation for maximum effect
    nativeEvent.stopImmediatePropagation()
  }, [onNext, onPrev, onClose])

  if (!isOpen) return null

  const themeStyles = {
    light: 'bg-white/95 border-gray-200 text-gray-900',
    dark: 'bg-gray-800/95 border-gray-700 text-gray-100',
    sepia: 'bg-amber-50/95 border-amber-200 text-amber-900'
  }

  const inputStyles = {
    light: 'bg-white border-gray-300 focus:border-blue-500 text-gray-900 placeholder-gray-400',
    dark: 'bg-gray-700 border-gray-600 focus:border-blue-400 text-gray-100 placeholder-gray-400',
    sepia: 'bg-amber-100 border-amber-300 focus:border-amber-500 text-amber-900 placeholder-amber-400'
  }

  const buttonStyles = {
    light: 'hover:bg-gray-100 text-gray-600',
    dark: 'hover:bg-gray-700 text-gray-300',
    sepia: 'hover:bg-amber-200 text-amber-700'
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-20 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border backdrop-blur-sm ${themeStyles[theme]}`}
        >
          <Search className="w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('search.placeholder')}
            className={`w-48 px-2 py-1 text-sm border rounded focus:outline-none ${inputStyles[theme]}`}
          />
          <div className="flex items-center gap-1 text-sm min-w-[40px]">
            {totalResults > 0 ? (
              <span>{t('search.resultCount', { current: currentIndex + 1, total: totalResults })}</span>
            ) : (
              <span className="text-gray-400">{t('search.noResults')}</span>
            )}
          </div>
          <div className="flex items-center gap-0.5 ml-1">
            <button
              onClick={onPrev}
              disabled={totalResults === 0}
              className={`p-1 rounded transition-colors disabled:opacity-30 ${buttonStyles[theme]}`}
              title={t('reader.prevPage')}
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={onNext}
              disabled={totalResults === 0}
              className={`p-1 rounded transition-colors disabled:opacity-30 ${buttonStyles[theme]}`}
              title={t('reader.nextPage')}
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded transition-colors ml-1 ${buttonStyles[theme]}`}
            title={t('nav.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}