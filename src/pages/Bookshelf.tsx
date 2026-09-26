import { useCallback, useState, useEffect, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useStore, Book, filterLibraryBooks } from '../store'
import Sidebar from '../components/common/Sidebar'
import BookCard from '../components/bookshelf/BookCard'
import BookList from '../components/bookshelf/BookList'
import LibraryControls from '../components/bookshelf/LibraryControls'
import { useTranslation } from '../hooks/useTranslation'
import {
  FileText,
  FolderOpen,
  BookOpen,
  Clock
} from 'lucide-react'

export default function Bookshelf() {
  const { books, addBook, removeBook, settings, libraryFilters, librarySort, viewMode, setViewMode } = useStore(useShallow(state => ({
    books: state.books, addBook: state.addBook, removeBook: state.removeBook, settings: state.settings,
    libraryFilters: state.libraryFilters, librarySort: state.librarySort, viewMode: state.viewMode, setViewMode: state.setViewMode
  })))
  const [isDragging, setIsDragging] = useState(false)
  const [missingFiles, setMissingFiles] = useState<Set<string>>(new Set())
  const { t } = useTranslation()

  // Changes to favorites/progress never trigger another full round of filesystem IPC.
  const fileSignature = useMemo(() => JSON.stringify(books.filter(book => !book.isCached).map(book => [book.id, book.path])), [books])
  useEffect(() => {
    if (!window.electronAPI) return
    let canceled = false
    const candidates: [string, string][] = JSON.parse(fileSignature)
    const missing = new Set<string>()
    let next = 0
    const worker = async () => {
      while (!canceled && next < candidates.length) {
        const [id, path] = candidates[next++]
        try { if (!await window.electronAPI.checkFileExists(path)) missing.add(id) }
        catch { missing.add(id) }
      }
    }
    // Paint the library before checking unavailable files; bound concurrent requests.
    const timer = setTimeout(() => {
      Promise.all(Array.from({ length: Math.min(8, candidates.length) }, worker))
        .then(() => { if (!canceled) setMissingFiles(missing) })
    }, 250)
    return () => { canceled = true; clearTimeout(timer) }
  }, [fileSignature])

  const handleSelectBook = useCallback((book: Book) => {
    useStore.getState().setCurrentBook(book)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files).filter(file => /\.(md|markdown|txt)$/i.test(file.name))
      for (const file of files) {
        try {
          const nativeImport = await window.electronAPI?.importDroppedFile(file)
          if (!nativeImport || nativeImport.status === 'canceled' || nativeImport.status === 'failed') continue
          // A synthetic File has no original disk path. Cache only that explicit
          // case; canceled native authorization must never silently create a copy.
          const isCached = nativeImport.status === 'unavailable'
          const content = nativeImport.status === 'imported' ? nativeImport.content : await file.text()
          const filePath = nativeImport.status === 'imported'
            ? nativeImport.path
            : await window.electronAPI.saveDraggedFile(file.name, content)
          const book = addBook({
            title: file.name.replace(/\.(md|markdown|txt)$/i, ''),
            path: filePath,
            lastRead: new Date().toISOString(),
            progress: 0,
            wordCount: content.length,
            isCached
          })
          // Import completion must not replace an edit started while disk access
          // or native permission was pending. Multi-file drops only add books.
          const reader = useStore.getState()
          if (files.length === 1 && !reader.hasUnsavedChanges && !reader.isSaving) {
            reader.openBookWithContent(book, content)
          }
        } catch (error) {
          console.error('[DragDrop] Import failed:', error)
        }
      }
    },
    [addBook]
  )

  const handleImportFile = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.importFile()
    } else {
      // Fallback for browser - use file input
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = true
      input.accept = '.md,.markdown,.txt'
      input.onchange = async (e) => {
        const files = (e.target as HTMLInputElement).files
        if (!files) return

        for (const file of Array.from(files)) {
          const content = await file.text()
          const title = file.name.replace(/\.(md|markdown|txt)$/i, '')
          addBook({
            title,
            path: file.name,
            lastRead: new Date().toISOString(),
            progress: 0,
            wordCount: content.length
          })
        }
      }
      input.click()
    }
  }

  const handleImportFolder = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.importFolder()
    }
  }

  const filteredBooks = useMemo(() => filterLibraryBooks(books, libraryFilters, librarySort), [books, libraryFilters, librarySort])
  const recentBooks = useMemo(() => filterLibraryBooks(books, { query: '', favoriteOnly: false, status: 'all' }, 'recent').slice(0, 5), [books])
  const hasFilters = !!(libraryFilters.query || libraryFilters.favoriteOnly || libraryFilters.status !== 'all')

  const themeStyles = {
    light: 'bg-white text-gray-900',
    dark: 'bg-gray-900 text-gray-100',
    sepia: 'bg-amber-50 text-amber-950'
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      <Sidebar onSelectBook={handleSelectBook} />

      <main
        className={`flex-1 overflow-y-auto custom-scrollbar ${themeStyles[settings.theme]}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drop overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-blue-500/20 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className={`p-8 rounded-2xl border-2 border-dashed ${settings.theme === 'dark' ? 'border-gray-500 bg-gray-800' : 'border-gray-400 bg-white'}`}>
              <FileText className="w-16 h-16 mx-auto mb-4 text-blue-500" />
              <p className="text-lg font-medium">{t('bookshelf.dropHint')}</p>
            </div>
          </div>
        )}

        {books.length === 0 ? (
          /* Empty state */
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <BookOpen className={`w-24 h-24 mx-auto mb-6 ${settings.theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
              <h2 className="text-2xl font-bold mb-2">{t('bookshelf.welcome')}</h2>
              <p className={`mb-6 ${settings.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('bookshelf.importHint')}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleImportFile}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  {t('bookshelf.importFile')}
                </button>
                {typeof window !== 'undefined' && window.electronAPI && (
                  <button
                    onClick={handleImportFolder}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <FolderOpen className="w-4 h-4" />
                    {t('bookshelf.importFolder')}
                  </button>
                )}
              </div>
              <p className={`mt-6 text-sm ${settings.theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                {t('bookshelf.dragHint')}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* Recent books section */}
            {!hasFilters && recentBooks.length > 0 && (
              <section className="mb-8">
                <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <Clock className="w-5 h-5" />
                  {t('bookshelf.continueReading')}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {recentBooks.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      onClick={() => handleSelectBook(book)}
                      onRemove={() => removeBook(book.id)}
                      showProgress
                      theme={settings.theme}
                      fileMissing={missingFiles.has(book.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* All books section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <BookOpen className="w-5 h-5" />
                  {t('library.allDocuments')}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1 text-sm rounded ${
                      viewMode === 'grid'
                        ? 'bg-blue-500 text-white'
                        : settings.theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    {t('bookshelf.gridView')}
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1 text-sm rounded ${
                      viewMode === 'list'
                        ? 'bg-blue-500 text-white'
                        : settings.theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    {t('bookshelf.listView')}
                  </button>
                </div>
              </div>

              <LibraryControls count={filteredBooks.length} />
              {filteredBooks.length === 0 ? (
                <p className={`text-center py-12 ${settings.theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  {t('bookshelf.noMatch')}
                </p>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredBooks.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      onClick={() => handleSelectBook(book)}
                      onRemove={() => removeBook(book.id)}
                      theme={settings.theme}
                      fileMissing={missingFiles.has(book.id)}
                    />
                  ))}
                </div>
              ) : (
                <BookList books={filteredBooks} onSelectBook={handleSelectBook} onRemoveBook={removeBook} theme={settings.theme} missingFiles={missingFiles} />
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
