import { useState, useRef, useEffect, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useStore, Book, filterLibraryBooks } from '../../store'
import { useTranslation } from '../../hooks/useTranslation'
import { FolderOpen, FileText, Search, Trash2, Clock, ChevronDown } from 'lucide-react'

interface SidebarProps {
  onSelectBook: (book: Book) => void
}

export default function Sidebar({ onSelectBook }: SidebarProps) {
  const {
    books,
    isSidebarOpen,
    libraryFilters,
    setLibraryFilters,
    librarySort: sortBy,
    setLibrarySort: setSortBy,
    removeBook,
    settings
  } = useStore(useShallow(state => ({ books: state.books, isSidebarOpen: state.isSidebarOpen, libraryFilters: state.libraryFilters,
    setLibraryFilters: state.setLibraryFilters, librarySort: state.librarySort, setLibrarySort: state.setLibrarySort,
    removeBook: state.removeBook, settings: state.settings })))
  const { t } = useTranslation()

  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filteredBooks = useMemo(() => filterLibraryBooks(books, libraryFilters, sortBy), [books, libraryFilters, sortBy])

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // 打开文件
  const handleOpenFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDropdown(false)
    if (window.electronAPI) {
      window.electronAPI.importFile()
    }
  }

  // 打开文件夹
  const handleOpenFolder = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDropdown(false)
    if (window.electronAPI) {
      window.electronAPI.importFolder()
    }
  }

  // 切换下拉菜单
  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDropdown(!showDropdown)
  }

  if (!isSidebarOpen) return null

  const themeStyles = {
    light: 'bg-gray-50 border-gray-200 text-gray-900',
    dark: 'bg-gray-800 border-gray-700 text-gray-100',
    sepia: 'bg-amber-100 border-amber-200 text-amber-950'
  }

  return (
    <aside
      className={`w-[280px] shrink-0 h-full border-r flex flex-col ${themeStyles[settings.theme]}`}
    >
      {/* 打开按钮 */}
      <div className="p-3 border-b border-inherit">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={toggleDropdown}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            <FolderOpen className="w-4 h-4" />
            <span>{t('sidebar.open')}</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* 下拉菜单 */}
          {showDropdown && (
            <div
              className={`absolute top-full left-0 right-0 mt-1 rounded-lg shadow-xl overflow-hidden z-[9999] ${
                settings.theme === 'dark' ? 'bg-gray-700' : 'bg-white border border-gray-200'
              }`}
            >
              <button
                onClick={handleOpenFile}
                className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors ${
                  settings.theme === 'dark'
                    ? 'text-gray-100 hover:bg-gray-600'
                    : 'text-gray-900 hover:bg-blue-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                {t('sidebar.openFile')}
              </button>
              <button
                onClick={handleOpenFolder}
                className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors ${
                  settings.theme === 'dark'
                    ? 'text-gray-100 hover:bg-gray-600'
                    : 'text-gray-900 hover:bg-blue-50'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                {t('sidebar.openFolder')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 搜索 */}
      <div className="p-3 border-b border-inherit">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('sidebar.search')}
            value={libraryFilters.query}
            onChange={(e) => setLibraryFilters({ query: e.target.value })}
            className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              settings.theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
          />
        </div>
      </div>

      {/* 排序选项 */}
      <div className="px-3 py-2 border-b border-inherit">
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setSortBy('recent')}
            className={`px-2 py-1 rounded ${
              sortBy === 'recent'
                ? 'bg-blue-500 text-white'
                : 'hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {t('sidebar.sortBy.recent')}
          </button>
          <button
            onClick={() => setSortBy('title')}
            className={`px-2 py-1 rounded ${
              sortBy === 'title'
                ? 'bg-blue-500 text-white'
                : 'hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {t('sidebar.sortBy.title')}
          </button>
          <button
            onClick={() => setSortBy('progress')}
            className={`px-2 py-1 rounded ${
              sortBy === 'progress'
                ? 'bg-blue-500 text-white'
                : 'hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {t('sidebar.sortBy.progress')}
          </button>
        </div>
      </div>

      {/* 书籍列表 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">

          {filteredBooks.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              {books.length === 0
                ? t('sidebar.noBooks')
                : t('sidebar.noResults')}
            </div>
          ) : (
            filteredBooks.map((book) => (
              <div
                key={book.id}
                className={`group p-3 border-b border-inherit cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                role="button" tabIndex={0} aria-label={book.title}
                onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onSelectBook(book) } }}
                onClick={() => onSelectBook(book)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">
                      {book.favorite && <span className="text-amber-500 mr-1" aria-label={t('library.favorites')}>★</span>}{book.title}
                      {book.isCached && (
                        <span className="ml-1 text-orange-500 text-[10px]">[{t('sidebar.cached')}]</span>
                      )}
                    </h4>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {book.path.split('/').pop()}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(book.lastRead).toLocaleDateString()}</span>
                      <span>·</span>
                      <span>{book.progress}%</span>
                    </div>
                    <div className="progress-bar mt-2">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${book.progress}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onKeyDown={event => event.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      removeBook(book.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-500 transition-all"
                    title={t('actions.remove')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}

      </div>

      {/* 底部统计 */}
      <div className="p-3 border-t border-inherit text-xs text-gray-500">
        {t('sidebar.bookCount', { count: books.length.toString() })}
      </div>
    </aside>
  )
}