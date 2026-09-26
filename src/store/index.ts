import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Locale } from '../i18n'
import { createBufferedStorage } from '../utils/storage'

// Types
export interface Book {
  id: string
  title: string
  path: string
  lastRead: string
  progress: number
  wordCount: number
  addedAt: string
  isCached?: boolean  // 标记是否是缓存的拖拽文件
  favorite?: boolean
}

export type LibrarySort = 'recent' | 'title' | 'progress' | 'added'
export interface LibraryFilters {
  query: string
  favoriteOnly: boolean
  status: 'all' | 'unread' | 'reading' | 'finished'
}
const emptyLibraryFilters: LibraryFilters = { query: '', favoriteOnly: false, status: 'all' }
/** Shared by the shelf and sidebar so every view uses the same combined filters. */
export function filterLibraryBooks(books: Book[], filters: LibraryFilters, sort: LibrarySort): Book[] {
  const terms = filters.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  return books.filter(book => {
    if (filters.favoriteOnly && !book.favorite) return false
    if (filters.status === 'unread' && book.progress > 0) return false
    if (filters.status === 'reading' && (book.progress <= 0 || book.progress >= 100)) return false
    if (filters.status === 'finished' && book.progress < 100) return false
    const text = [book.title, book.path].join(' ').toLocaleLowerCase()
    return terms.every(term => text.includes(term))
  }).sort((a, b) => {
    if (sort === 'title') return a.title.localeCompare(b.title)
    if (sort === 'progress') return b.progress - a.progress
    const field = sort === 'added' ? 'addedAt' : 'lastRead'
    return (Date.parse(b[field]) || 0) - (Date.parse(a[field]) || 0)
  })
}

export interface ReaderSettings {
  theme: 'light' | 'dark' | 'sepia'
  fontSize: number
  lineHeight: number
  fontFamily: string
  pageWidth: number
  flipMode: 'scroll' | 'slide' | 'simulation'
  locale: Locale
}

export interface UIState {
  viewMode: 'grid' | 'list'  // 书架视图模式
  sidebarOpen: boolean
}

export interface TableOfContents {
  id: string
  title: string
  level: number
  position: number
}

export interface TableFormatInfo {
  /** 表格在原文中的起始位置 */
  startIndex: number
  /** 表格在原文中的结束位置 */
  endIndex: number
  /** 原始表格文本 */
  originalText: string
  /** 是否是 HTML 格式 */
  isHtml: boolean
}

interface AppState {
  // Books
  books: Book[]
  currentBook: Book | null
  currentContent: string  // 当前书籍的内容，只在内存中，不持久化
  isLoadingContent: boolean
  loadedBookId: string | null
  contentNotice: 'loadFailed' | 'refreshFailed' | 'cachedCopy' | null
  isSaving: boolean
  addBook: (book: Omit<Book, 'id' | 'addedAt'>) => Book
  addBooks: (books: Omit<Book, 'id' | 'addedAt'>[]) => Book[]
  removeBook: (id: string) => void
  updateBook: (id: string, updates: Partial<Book>) => void
  toggleFavorite: (id: string) => void
  libraryFilters: LibraryFilters
  setLibraryFilters: (filters: Partial<LibraryFilters>) => void
  resetLibraryFilters: () => void
  librarySort: LibrarySort
  setLibrarySort: (sort: LibrarySort) => void
  setCurrentBook: (book: Book | null) => void
  openBookWithContent: (book: Book, content: string) => void
  updateProgress: (id: string, progress: number) => void
  loadBookContent: (book: Book) => Promise<void>
  refreshCurrentContent: () => Promise<void>
  setCurrentContent: (content: string) => void

  // Original content for format preservation
  originalContent: string
  setOriginalContent: (content: string) => void
  tableFormats: TableFormatInfo[]
  setTableFormats: (formats: TableFormatInfo[]) => void

  // Settings
  settings: ReaderSettings
  updateSettings: (settings: Partial<ReaderSettings>) => void

  // UI State
  isSidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  isSettingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  isFullscreen: boolean
  setFullscreen: (fullscreen: boolean) => void
  viewMode: 'grid' | 'list'
  setViewMode: (mode: 'grid' | 'list') => void

  // Edit Mode
  isEditMode: boolean
  setEditMode: (edit: boolean) => void
  editedContent: string
  setEditedContent: (content: string) => void
  hasUnsavedChanges: boolean
  setHasUnsavedChanges: (hasChanges: boolean) => void
  saveContent: () => Promise<void>

  // Scroll position for current book
  scrollPositions: Record<string, number>
  setScrollPosition: (bookId: string, position: number) => void
  updateReadingPosition: (bookId: string, position: number, progress: number) => void

  // Table of contents
  tableOfContents: TableOfContents[]
  setTableOfContents: (toc: TableOfContents[]) => void

  // Search
  isSearchOpen: boolean
  setSearchOpen: (open: boolean) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  currentSearchIndex: number
  setCurrentSearchIndex: (index: number) => void
  clearSearchHighlights: () => void
}

const defaultSettings: ReaderSettings = {
  theme: 'light',
  fontSize: 18,
  lineHeight: 1.8,
  fontFamily: 'serif',
  pageWidth: 720,
  flipMode: 'scroll',
  locale: 'en'
}

let contentRequest = 0

type PersistedState = Pick<AppState, 'books' | 'settings' | 'scrollPositions' | 'viewMode' | 'librarySort'>
const persistence = createBufferedStorage<PersistedState>()
export const flushStorePersistence = persistence.flush

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Books
      books: [],
      currentBook: null,
      currentContent: '',
      isLoadingContent: false,
      loadedBookId: null,
      contentNotice: null,
      isSaving: false,
      libraryFilters: emptyLibraryFilters,
      setLibraryFilters: filters => set(state => ({ libraryFilters: { ...state.libraryFilters, ...filters } })),
      resetLibraryFilters: () => set({ libraryFilters: emptyLibraryFilters }),
      librarySort: 'recent',
      setLibrarySort: librarySort => { if (get().librarySort !== librarySort) set({ librarySort }) },
      toggleFavorite: id => {
        const book = get().books.find(item => item.id === id)
        if (book) get().updateBook(id, { favorite: !book.favorite })
      },

      // Original content for format preservation
      originalContent: '',
      setOriginalContent: (content) => set({ originalContent: content }),
      tableFormats: [],
      setTableFormats: (formats) => set({ tableFormats: formats }),

      addBook: bookData => get().addBooks([bookData])[0],
      addBooks: incoming => {
        if (incoming.length === 0) return []
        const books = get().books
        const byPath = new Map(books.map(book => [book.path, book]))
        const added: Book[] = []
        const result: Book[] = []
        const addedAt = new Date().toISOString()
        for (const bookData of incoming) {
          const existing = byPath.get(bookData.path)
          const book: Book = existing
            ? { ...existing, ...bookData, progress: existing.progress, favorite: existing.favorite }
            : { ...bookData, id: crypto.randomUUID(), addedAt }
          if (!existing) added.push(book)
          byPath.set(book.path, book)
          result.push(book)
        }
        const nextBooks = [...added.reverse().map(book => byPath.get(book.path)!), ...books.map(book => byPath.get(book.path)!)]
        set(state => ({ books: nextBooks, currentBook: state.currentBook ? byPath.get(state.currentBook.path) || state.currentBook : null }))
        return result
      },

      removeBook: (id) => {
        if (get().currentBook?.id === id) get().setCurrentBook(null)
        set(state => {
          const books = state.books.filter(book => book.id !== id)
          const { [id]: removedPosition, ...scrollPositions } = state.scrollPositions
          return { books, scrollPositions }
        })
      },

      updateBook: (id, updates) => {
        set((state) => ({
          books: state.books.map((b) =>
            b.id === id ? { ...b, ...updates } : b
          ),
          currentBook:
            state.currentBook?.id === id
              ? { ...state.currentBook, ...updates }
              : state.currentBook
        }))
      },

      setCurrentBook: (book) => {
        if (book?.id === get().currentBook?.id) return
        contentRequest++
        const lastRead = new Date().toISOString()
        set(state => ({
          books: state.books.map(item => item.id === book?.id ? { ...item, lastRead } : item),
          currentBook: book ? { ...(state.books.find(item => item.id === book.id) || book), lastRead } : null,
          currentContent: '',
          loadedBookId: null,
          contentNotice: null,
          isLoadingContent: false,
          isEditMode: false,
          editedContent: '',
          hasUnsavedChanges: false,
          tableOfContents: [],
          isSearchOpen: false,
          searchQuery: '',
          currentSearchIndex: 0,
        }))
      },

      openBookWithContent: (book, content) => {
        get().setCurrentBook(book)
        contentRequest++
        set({ currentContent: content, loadedBookId: book.id, contentNotice: null, isLoadingContent: false })
      },

      loadBookContent: async (book) => {
        if (get().currentBook?.id !== book.id || get().loadedBookId === book.id || get().isLoadingContent) return
        const request = ++contentRequest
        set({ isLoadingContent: true, contentNotice: null })
        try {
          if (!window.electronAPI || !(book.path.startsWith('/') || /^[A-Za-z]:/.test(book.path))) {
            throw new Error('A readable local file is required')
          }
          const content = await window.electronAPI.readFile(book.path)
          if (request !== contentRequest || get().currentBook?.id !== book.id) return
          set({ currentContent: content, loadedBookId: book.id, isLoadingContent: false })
        } catch (error) {
          if (request !== contentRequest || get().currentBook?.id !== book.id) return
          console.error('Failed to load book content:', error)
          // Keep errors out of the editable document, and mark this attempt complete.
          set({ contentNotice: 'loadFailed', loadedBookId: book.id, isLoadingContent: false })
        }
      },

      refreshCurrentContent: async () => {
        const { currentBook, isEditMode, isLoadingContent } = get()
        if (!currentBook || isEditMode || isLoadingContent) return
        if (currentBook.isCached) {
          set({ contentNotice: 'cachedCopy' })
          return
        }
        const request = ++contentRequest
        set({ isLoadingContent: true, contentNotice: null })
        try {
          const content = await window.electronAPI.readFile(currentBook.path)
          if (request !== contentRequest || get().currentBook?.id !== currentBook.id) return
          set({ currentContent: content, loadedBookId: currentBook.id, isLoadingContent: false })
        } catch (error) {
          if (request !== contentRequest || get().currentBook?.id !== currentBook.id) return
          console.error('Failed to refresh book content:', error)
          // Preserve the last successfully loaded content after a failed refresh.
          set({ contentNotice: 'refreshFailed', isLoadingContent: false })
        }
      },

      setCurrentContent: (content) => {
        set({ currentContent: content })
      },

      updateProgress: (id, progress) => {
        get().updateReadingPosition(id, get().scrollPositions[id] || 0, progress)
      },

      // Settings
      settings: defaultSettings,

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        }))
      },

      // UI State
      isSidebarOpen: true,
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      isSettingsOpen: false,
      setSettingsOpen: (open) => set({ isSettingsOpen: open }),
      isFullscreen: false,
      setFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),
      viewMode: 'grid',
      setViewMode: (mode) => set({ viewMode: mode }),

      // Edit Mode
      isEditMode: false,
      setEditMode: (edit) => {
        const { currentContent, isLoadingContent, contentNotice } = get()
        if (edit && (isLoadingContent || contentNotice === 'loadFailed')) return
        if (edit) {
          set({
            isEditMode: true,
            editedContent: currentContent,
            hasUnsavedChanges: false
          })
        } else {
          set({ isEditMode: false, hasUnsavedChanges: false })
        }
      },
      editedContent: '',
      setEditedContent: (content) => set({ editedContent: content, hasUnsavedChanges: content !== get().currentContent }),
      hasUnsavedChanges: false,
      setHasUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),
      saveContent: async () => {
        const { currentBook, editedContent, isSaving } = get()
        if (!currentBook || isSaving) return
        if (!window.electronAPI) throw new Error('Saving requires the desktop app')
        set({ isSaving: true })
        try {
          await window.electronAPI.writeFile(currentBook.path, editedContent)
          get().updateBook(currentBook.id, { wordCount: editedContent.length })
          if (get().currentBook?.id === currentBook.id) {
            set({ currentContent: editedContent, hasUnsavedChanges: get().editedContent !== editedContent })
          }
        } finally {
          set({ isSaving: false })
        }
      },

      // Scroll positions
      scrollPositions: {},
      setScrollPosition: (bookId, position) => {
        const book = get().books.find(item => item.id === bookId)
        if (book) get().updateReadingPosition(bookId, position, book.progress)
      },
      updateReadingPosition: (bookId, position, progress) => {
        const state = get()
        const book = state.books.find(item => item.id === bookId)
        if (!book || !Number.isFinite(position) || !Number.isFinite(progress)) return
        const nextPosition = Math.max(0, Math.round(position))
        const nextProgress = Math.max(0, Math.min(100, Math.round(progress)))
        const positionChanged = state.scrollPositions[bookId] !== nextPosition
        const progressChanged = book.progress !== nextProgress
        if (!positionChanged && !progressChanged) return
        const updatedBook = progressChanged ? { ...book, progress: nextProgress } : book
        set({
          scrollPositions: positionChanged ? { ...state.scrollPositions, [bookId]: nextPosition } : state.scrollPositions,
          books: progressChanged ? state.books.map(item => item.id === bookId ? updatedBook : item) : state.books,
          currentBook: state.currentBook?.id === bookId ? updatedBook : state.currentBook,
        })
      },

      // Table of contents
      tableOfContents: [],
      setTableOfContents: (toc) => set({ tableOfContents: toc }),

      // Search
      isSearchOpen: false,
      setSearchOpen: (open) => set({ isSearchOpen: open }),
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query, currentSearchIndex: 0 }),
      currentSearchIndex: 0,
      setCurrentSearchIndex: (index) => set({ currentSearchIndex: index }),
      clearSearchHighlights: () => set({ searchQuery: '', currentSearchIndex: 0, isSearchOpen: false })
    }),
    {
      name: 'markdown-reader-storage',
      storage: persistence,
      partialize: (state) => ({
        books: state.books,
        settings: state.settings,
        scrollPositions: state.scrollPositions,
        viewMode: state.viewMode,
        librarySort: state.librarySort,
      }),
      // 从持久化数据恢复时，不恢复 currentBook 和 currentContent
      merge: (persisted, current) => {
        const persistedState = persisted as any

        let validBooks: Book[] = []

        if (Array.isArray(persistedState?.books)) {
          // 移除旧的 content 和 cachedContent 字段，只保留元数据
          validBooks = persistedState.books
            .filter((book: any) => book && typeof book.id === 'string' && typeof book.path === 'string')
            .map((book: any) => {
              const { content, cachedContent, ...rest } = book
              return { ...rest, favorite: book.favorite === true } as Book
            })
            // 只保留有绝对路径的书籍
            .filter((book: Book) => {
              const path = book.path || ''
              const isValid = path.startsWith('/') || /^[A-Za-z]:/.test(path)
              return isValid
            })
        }

        return {
          ...current,
          books: validBooks.length > 0 ? validBooks : current.books,
          settings: { ...current.settings, ...persistedState?.settings },
          scrollPositions: Object.fromEntries(validBooks.flatMap(book => {
            const position = persistedState?.scrollPositions?.[book.id]
            return typeof position === 'number' && Number.isFinite(position) && position >= 0 ? [[book.id, position]] : []
          })),
          viewMode: persistedState?.viewMode === 'list' ? 'list' : 'grid',
          librarySort: ['recent', 'title', 'progress', 'added'].includes(persistedState?.librarySort) ? persistedState.librarySort : 'recent',
          currentBook: null,
          currentContent: ''
        }
      }
    }
  )
)
