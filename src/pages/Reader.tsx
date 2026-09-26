import { lazy, Suspense, useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { useStore } from '../store'
import { useTranslation } from '../hooks/useTranslation'
import MarkdownRenderer from '../components/reader/MarkdownRenderer'
import ProgressBar from '../components/reader/ProgressBar'
import Settings from '../components/reader/Settings'
import SearchPanel from '../components/common/SearchPanel'
import {
  List,
  Star,
  Maximize2,
  Minimize2,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Edit3,
  RefreshCw,
  Search,
  Settings as SettingsIcon
} from 'lucide-react'

const MarkdownEditor = lazy(() => import('../components/editor/MarkdownEditor'))

export default function Reader() {
  const {
    currentBook,
    currentContent,
    isLoadingContent,
    loadedBookId,
    contentNotice,
    setCurrentBook,
    settings,
    updateReadingPosition,
    toggleFavorite,
    tableOfContents,
    setTableOfContents,
    isSettingsOpen,
    setSettingsOpen,
    isEditMode,
    setEditMode,
    hasUnsavedChanges,
    loadBookContent,
    refreshCurrentContent,
    isSearchOpen,
    setSearchOpen,
    searchQuery,
    setSearchQuery,
    currentSearchIndex,
    setCurrentSearchIndex
  } = useStore()
  const { t } = useTranslation()
  const copyLabels = useMemo(() => ({ copy: t('reader.copyCode'), copied: t('reader.codeCopied'), failed: t('reader.copyFailed') }), [t])

  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isTocOpen, setIsTocOpen] = useState(false)
  const [outlineQuery, setOutlineQuery] = useState('')
  const [activeHeading, setActiveHeading] = useState('')
  const [focusMode, setFocusMode] = useState(false)
  const progressTimer = useRef<ReturnType<typeof setTimeout>>()
  const pendingProgress = useRef<{ id: string; top: number; progress: number } | null>(null)
  const flushProgress = useCallback(() => {
    clearTimeout(progressTimer.current)
    progressTimer.current = undefined
    const pending = pendingProgress.current
    if (pending) {
      pendingProgress.current = null
      updateReadingPosition(pending.id, pending.top, pending.progress)
    }
  }, [updateReadingPosition])
  useEffect(() => {
    window.addEventListener('pagehide', flushProgress, true)
    window.addEventListener('beforeunload', flushProgress, true)
    return () => {
      window.removeEventListener('pagehide', flushProgress, true)
      window.removeEventListener('beforeunload', flushProgress, true)
      flushProgress()
    }
  }, [currentBook?.id, isEditMode, flushProgress])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const lastTitleRef = useRef<string>('')
  const [totalSearchResults, setTotalSearchResults] = useState(0)
  const searchScrollTimer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => clearTimeout(searchScrollTimer.current), [])

  // Store search highlights in a ref for direct access
  const searchHighlightsRef = useRef<{
    nodes: HTMLElement[],
    currentIndex: number,
    query: string
  }>({ nodes: [], currentIndex: 0, query: '' })

  const windowTitle = useMemo(() => {
    return currentBook ? `Markdown Reader - ${currentBook.title}` : 'Markdown Reader'
  }, [currentBook])

  useEffect(() => {
    if (windowTitle !== lastTitleRef.current) {
      lastTitleRef.current = windowTitle
      document.title = windowTitle
      if (window.electronAPI?.setWindowTitle) {
        window.electronAPI.setWindowTitle(windowTitle)
      }
    }
  }, [windowTitle])

  // Load book content when book changes
  useEffect(() => {
    if (currentBook && loadedBookId !== currentBook.id && !isLoadingContent) {
      loadBookContent(currentBook)
    }
  }, [currentBook?.id, loadedBookId, isLoadingContent, loadBookContent])

  // Observe actual layout (including loaded images), rather than guessing at
  // readiness with repeated timers. Restoring is tied to the mounted document.
  useEffect(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!container || !content || isEditMode || isLoadingContent) return
    const measure = () => {
      const height = container.clientHeight
      if (!height) return
      setTotalPages(Math.max(1, Math.ceil(container.scrollHeight / height)))
      setCurrentPage(Math.min(Math.max(1, Math.ceil(container.scrollHeight / height)), Math.floor(container.scrollTop / height) + 1))
    }
    if (currentBook) container.scrollTop = useStore.getState().scrollPositions[currentBook.id] || 0
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    observer.observe(content)
    return () => observer.disconnect()
  }, [currentBook?.id, currentContent, isEditMode, isLoadingContent])

  useEffect(() => {
    if (!containerRef.current || isEditMode) return
    const headings = Array.from(contentRef.current?.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6') || [])
    const visible = new Set<Element>()
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target))
      const first = headings.find(heading => visible.has(heading))
      if (first) setActiveHeading(first.id)
    }, { root: containerRef.current, rootMargin: '0px 0px -65% 0px' })
    headings.forEach(heading => observer.observe(heading))
    return () => observer.disconnect()
  }, [tableOfContents, isEditMode])

  const visibleHeadings = useMemo(() => tableOfContents.filter(item =>
    item.title.toLocaleLowerCase().includes(outlineQuery.trim().toLocaleLowerCase())
  ), [tableOfContents, outlineQuery])

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!currentBook || isLoadingContent) return
      const target = e.target as HTMLDivElement
      const scrollTop = target.scrollTop
      const scrollHeight = target.scrollHeight - target.clientHeight
      const progress = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0
      pendingProgress.current = { id: currentBook.id, top: scrollTop, progress }
      if (!progressTimer.current) progressTimer.current = setTimeout(flushProgress, 150)

      // Calculate current page based on scroll position
      // Use container scrollHeight for accurate page calculation
      const containerHeight = target.clientHeight
      const totalContentHeight = target.scrollHeight

      // Calculate which page we're on (1-indexed)
      // We're on page N if scrollTop is between (N-1)*containerHeight and N*containerHeight
      // But also consider being near the end - we might be on the last page
      const maxScroll = totalContentHeight - containerHeight
      const isNearEnd = maxScroll - scrollTop < containerHeight * 0.1 // within 10% of end

      let currentPageNum: number
      if (totalContentHeight <= containerHeight) {
        currentPageNum = 1
      } else if (isNearEnd && scrollTop > 0) {
        // If we're near the end, show the last page number
        currentPageNum = totalPages
      } else {
        // Normal calculation: which screen are we viewing?
        currentPageNum = Math.min(totalPages, Math.floor(scrollTop / containerHeight) + 1)
      }

      setCurrentPage(currentPageNum)
    },
    [currentBook?.id, isLoadingContent, flushProgress, totalPages]
  )

  const scrollToElement = useCallback((elementId: string) => {
    const container = containerRef.current
    const element = document.getElementById(elementId)
    if (!container || !element || !container.contains(element)) return
    container.scrollTop += element.getBoundingClientRect().top - container.getBoundingClientRect().top - 20
    setActiveHeading(elementId)
  }, [])

  const handleTocClick = useCallback((id: string) => {
    scrollToElement(id)
  }, [scrollToElement])

  const handlePrevPage = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    // 上一页：滚动一个完整的视口高度
    const scrollAmount = container.clientHeight
    container.scrollTop = Math.max(0, container.scrollTop - scrollAmount)
  }, [])

  const handleNextPage = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    // 下一页：滚动一个完整的视口高度
    const scrollAmount = container.clientHeight
    const maxScroll = container.scrollHeight - container.clientHeight
    const newScrollTop = container.scrollTop + scrollAmount

    // 允许滚动到最后一页（即使超过了精确的页边界）
    container.scrollTop = Math.min(maxScroll, newScrollTop)
  }, [])

  // ===========================================
  // SEARCH FUNCTIONALITY - Self-contained
  // ===========================================

  // Clear all search highlights from DOM
  const clearSearchHighlights = useCallback(() => {
    clearTimeout(searchScrollTimer.current)
    const { nodes } = searchHighlightsRef.current
    nodes.forEach(node => {
      const parent = node.parentNode
      if (parent) {
        while (node.firstChild) {
          parent.insertBefore(node.firstChild, node)
        }
        parent.removeChild(node)
      }
    })
    searchHighlightsRef.current = { nodes: [], currentIndex: 0, query: '' }
    setTotalSearchResults(0)
    setCurrentSearchIndex(0)
  }, [setCurrentSearchIndex])

  // Navigate to next/previous search result
  const navigateSearch = useCallback((direction: 'next' | 'prev') => {
    const { nodes, currentIndex } = searchHighlightsRef.current
    if (nodes.length === 0) {
      console.log('[Search] No nodes to navigate')
      return
    }

    let newIndex: number
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % nodes.length
    } else {
      newIndex = (currentIndex - 1 + nodes.length) % nodes.length
    }

    // Update classes
    nodes.forEach((node, i) => {
      node.classList.toggle('search-highlight-current', i === newIndex)
      node.classList.toggle('search-highlight', i !== newIndex)
    })

    // Update ref
    searchHighlightsRef.current.currentIndex = newIndex
    setCurrentSearchIndex(newIndex)

    // Scroll container to element using direct scrollTop
    const target = nodes[newIndex]
    const containerScroll = containerRef.current
    if (target && containerScroll) {
      // Find the actual offset top of target relative to the scrollable content
      let offsetTop = 0
      let element: HTMLElement | null = target
      while (element && element !== containerScroll) {
        offsetTop += element.offsetTop
        element = element.offsetParent as HTMLElement
      }

      // Center the target in viewport
      const containerHeight = containerScroll.clientHeight
      const targetHeight = target.offsetHeight || 20
      const scrollTo = offsetTop - (containerHeight / 2) + (targetHeight / 2)

      // Use instant scroll for debugging, then smooth
      containerScroll.scrollTop = Math.max(0, scrollTo)

    }
  }, [setCurrentSearchIndex])

  // Perform search
  const performSearch = useCallback((query: string) => {
    // Always clear previous highlights first
    clearSearchHighlights()

    if (!query || !contentRef.current) {
      return
    }

    const container = contentRef.current
    const newNodes: HTMLElement[] = []

    // Create TreeWalker
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT
          const parent = node.parentElement
          if (!parent) return NodeFilter.FILTER_REJECT
          const tagName = parent.tagName.toLowerCase()
          if (['script', 'style', 'input', 'textarea', 'button'].includes(tagName) || parent.closest('button')) {
            return NodeFilter.FILTER_REJECT
          }
          return NodeFilter.FILTER_ACCEPT
        }
      }
    )

    const textNodes: Text[] = []
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode as Text)
    }

    // Search
    const searchRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')

    textNodes.forEach(node => {
      const text = node.textContent || ''
      const matches: { start: number; end: number }[] = []
      let match

      while ((match = searchRegex.exec(text)) !== null) {
        matches.push({ start: match.index, end: match.index + match[0].length })
      }

      // Apply highlights from end to start
      for (let i = matches.length - 1; i >= 0; i--) {
        const { start, end } = matches[i]
        try {
          const range = document.createRange()
          range.setStart(node, start)
          range.setEnd(node, end)
          const mark = document.createElement('mark')
          mark.className = 'search-highlight'
          range.surroundContents(mark)
          newNodes.unshift(mark)
        } catch (e) {
          // Skip cross-boundary ranges
        }
      }
    })

    newNodes.sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)

    // Store results
    searchHighlightsRef.current = { nodes: newNodes, currentIndex: 0, query }
    setTotalSearchResults(newNodes.length)
    setCurrentSearchIndex(0)



    // Scroll to first result
    if (newNodes.length > 0) {
      newNodes[0].classList.add('search-highlight-current')
      newNodes[0].classList.remove('search-highlight')

      // Allow layout to settle, but never move a newer document/search.
      searchScrollTimer.current = setTimeout(() => {
        const target = newNodes[0]
        const containerScroll = containerRef.current
        if (target && containerScroll?.contains(target) && searchHighlightsRef.current.nodes[0] === target) {
          // Find the actual offset top of target relative to the scrollable content
          let offsetTop = 0
          let element: HTMLElement | null = target
          while (element && element !== containerScroll) {
            offsetTop += element.offsetTop
            element = element.offsetParent as HTMLElement
          }

          const containerHeight = containerScroll.clientHeight
          const targetHeight = target.offsetHeight || 20
          const scrollTo = offsetTop - (containerHeight / 2) + (targetHeight / 2)

          containerScroll.scrollTop = Math.max(0, scrollTo)

        }
      }, 50)
    }
  }, [clearSearchHighlights, setCurrentSearchIndex])

  // Reapply the same query after refresh or returning from editing. Searching
  // while the content is unmounted would retain stale marks from the old DOM.
  useEffect(() => {
    clearSearchHighlights()
    if (!isSearchOpen || !searchQuery || isLoadingContent || isEditMode) return
    const timer = setTimeout(() => performSearch(searchQuery), 200)
    return () => clearTimeout(timer)
  }, [searchQuery, isSearchOpen, currentContent, isLoadingContent, isEditMode, performSearch, clearSearchHighlights])

  // ===========================================
// KEYBOARD SHORTCUTS
// ===========================================

  // Handle copy using Electron clipboard API
  const handleCopy = useCallback(async () => {
    const text = window.getSelection()?.toString()
    if (!text) return
    try {
      if (window.electronAPI?.writeClipboard) await window.electronAPI.writeClipboard(text)
      else await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('[Reader] Failed to copy:', error)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      // The editor owns its keyboard handling; the parent must not toggle search twice.
      if (isEditMode) return
      if (isSettingsOpen) {
        if (e.key === 'Escape') setSettingsOpen(false)
        return
      }

      // When search is open, only allow specific keys
      if (isSearchOpen) {
        // ESC closes search only
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          setSearchOpen(false)
          setSearchQuery('')
          return
        }
        // Allow Cmd/Ctrl+A to select all in search input
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
          return // Let browser handle
        }
        // Allow Cmd/Ctrl+C/V/X in search input
        if ((e.metaKey || e.ctrlKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
          return // Let browser handle
        }
        // CMD+F to toggle search off
        if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
          e.preventDefault()
          setSearchOpen(false)
          setSearchQuery('')
          return
        }
        // Block all other global shortcuts when search is open
        return
      }

      // Cmd/Ctrl+C - Copy using Electron clipboard
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
        const selection = window.getSelection()
        if (selection && selection.toString().length > 0) {
          handleCopy()
        }
        return
      }

      // Allow paste/cut/select-all to pass through when in input
      if ((e.metaKey || e.ctrlKey) && ['v', 'x', 'a'].includes(e.key.toLowerCase())) {
        return
      }

      // Cmd/Ctrl+R - Refresh
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault()
        refreshCurrentContent()
        return
      }

      // Cmd/Ctrl+F - Search (toggle)
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setSearchOpen(true)
        return
      }

      if (isEditMode) {
        if (e.key === 'Escape') {
          if (hasUnsavedChanges) {
            if (!window.confirm(t('editor.unsavedChanges'))) return
          }
          setEditMode(false)
        }
        return
      }

      // Navigation and other shortcuts (only when not in input)
      if (isInputFocused) {
        return
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Escape') {
        if (focusMode) { setFocusMode(false); return }
        if (isTocOpen) { setIsTocOpen(false); return }
        setCurrentBook(null)
        return
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        handlePrevPage()
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault()
        handleNextPage()
      } else if (e.key === 't') {
        setIsTocOpen(prev => !prev)
      } else if (e.key.toLowerCase() === 'f') {
        setFocusMode(value => !value)
      } else if (e.key === 's') {
        setSettingsOpen(!isSettingsOpen)
      } else if (e.key === 'e' || e.key === 'E') {
        setEditMode(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handlePrevPage, handleNextPage, setCurrentBook, setSettingsOpen, isSettingsOpen, isEditMode, setEditMode, hasUnsavedChanges, refreshCurrentContent, isSearchOpen, setSearchOpen, setSearchQuery, handleCopy, isTocOpen, focusMode])

  if (!currentBook) return null

  const themeStyles = {
    light: 'reader-light',
    dark: 'reader-dark',
    sepia: 'reader-sepia'
  }

  return (
    <div className={`flex-1 flex overflow-hidden ${themeStyles[settings.theme]}`}>
        {isTocOpen && !focusMode && (
          <aside
            className="w-64 h-full border-r border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0"
          >
            <div className="h-full overflow-y-auto custom-scrollbar p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <List className="w-4 h-4" />
                {t('reader.toc')}
              </h3>
              <input type="search" value={outlineQuery} onChange={event => setOutlineQuery(event.target.value)} placeholder={t('reader.outlineFilter')} aria-label={t('reader.outlineFilter')} className="mb-3 w-full rounded border border-current/15 bg-transparent px-2 py-1.5 text-sm" />
              {visibleHeadings.length === 0 ? (
                <p className="text-sm text-gray-500">{t('reader.noHeadings')}</p>
              ) : (
                <nav className="space-y-1">
                  {visibleHeadings.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleTocClick(item.id)}
                      aria-current={activeHeading === item.id ? 'location' : undefined}
                      className={`block w-full text-left py-1.5 px-2 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                        item.level === 2 ? 'pl-4'
                        : item.level === 3 ? 'pl-6'
                        : item.level === 4 ? 'pl-8'
                        : ''
                      } ${item.level === 1 ? 'font-medium' : ''} ${activeHeading === item.id ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200' : ''}`}
                    >
                      {item.title}
                    </button>
                  ))}
                </nav>
              )}
            </div>
          </aside>
        )}

      <div className="flex-1 flex flex-col relative min-w-0">
        {!isEditMode && !focusMode && (
          <header className="reader-toolbar flex items-center gap-3 border-b border-current/10 px-4 py-3 shrink-0">
            <button onClick={() => setCurrentBook(null)} className="reader-action" title={t('nav.backToBookshelf')} aria-label={t('nav.backToBookshelf')}>
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-semibold" title={currentBook.title}>{currentBook.title}</h1>
              <p className="text-xs opacity-60 mt-0.5">{t('reader.page', { current: currentPage, total: totalPages })} · {Math.round(settings.fontSize)}px</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => toggleFavorite(currentBook.id)} className="reader-action" aria-pressed={!!currentBook.favorite} title={t(currentBook.favorite ? 'library.removeFavorite' : 'library.favorite')} aria-label={t(currentBook.favorite ? 'library.removeFavorite' : 'library.favorite')}><Star className={`w-4 h-4 ${currentBook.favorite ? 'fill-amber-400 text-amber-500' : ''}`} /></button>
              <button onClick={() => setFocusMode(true)} className="reader-action" title={t('reader.focusMode')} aria-label={t('reader.focusMode')}><Maximize2 className="w-4 h-4" /></button>
              <button onClick={() => setSearchOpen(true)} className="reader-action" title={t('shortcuts.search')} aria-label={t('shortcuts.search')}><Search className="w-4 h-4" /></button>
              <button onClick={refreshCurrentContent} disabled={isLoadingContent} className="reader-action" title={t('actions.refresh')} aria-label={t('actions.refresh')}><RefreshCw className={`w-4 h-4 ${isLoadingContent ? 'animate-spin' : ''}`} /></button>
              <button onClick={() => setEditMode(true)} disabled={isLoadingContent || contentNotice === 'loadFailed'} className="reader-action" title={t('actions.edit')} aria-label={t('actions.edit')}><Edit3 className="w-4 h-4" /></button>
              <button onClick={() => setSettingsOpen(true)} className="reader-action" title={t('actions.settings')} aria-label={t('actions.settings')}><SettingsIcon className="w-4 h-4" /></button>
              <button onClick={() => setIsTocOpen(!isTocOpen)} className="reader-action" aria-pressed={isTocOpen} title={t('actions.toc')} aria-label={t('actions.toc')}><List className="w-4 h-4" /></button>
            </div>
          </header>
        )}
        {contentNotice && !isEditMode && (
          <div role="status" className="border-b border-amber-300/50 bg-amber-100/60 px-6 py-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
            {t(`reader.${contentNotice}`)}
          </div>
        )}

        {focusMode && !isEditMode && <button onClick={() => setFocusMode(false)} className="absolute top-3 right-3 z-20 reader-action bg-white/80 dark:bg-gray-800/80" title={t('reader.exitFocus')} aria-label={t('reader.exitFocus')}><Minimize2 className="w-4 h-4" /></button>}
          {isEditMode ? (
            <div
              key="editor"
              className="flex-1 overflow-hidden"
            >
              <Suspense fallback={<div role="status" className="p-8 opacity-60" aria-busy="true">{t('reader.loadingEditor')}</div>}>
                <MarkdownEditor />
              </Suspense>
            </div>
          ) : (
            <div
              key="reader"
              ref={containerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto custom-scrollbar select-text"
            >
              <div
                ref={contentRef}
                className="mx-auto pt-10 pb-24 px-8"
                style={{
                  maxWidth: settings.pageWidth,
                  fontSize: settings.fontSize,
                  lineHeight: settings.lineHeight,
                  fontFamily: settings.fontFamily === 'serif' ?
                    '"Songti SC", "Songti TC", "STSong", "SimSun", "Times New Roman", serif' :
                    settings.fontFamily === 'mono' ?
                    '"Menlo", "Monaco", "Consolas", monospace' :
                    '"PingFang SC", "PingFang TC", "PingFang HK", "Microsoft YaHei", "Helvetica Neue", sans-serif'
                }}
              >
                {isLoadingContent ? (
                  <div className="flex items-center justify-center py-20">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : currentContent && currentContent.length > 0 ? (
                  <MarkdownRenderer
                    content={currentContent}
                    copyLabels={copyLabels}
                    onTocGenerated={setTableOfContents}
                    onScrollToElement={scrollToElement}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <BookOpen className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-lg mb-2">{t('reader.noContent')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

        {!isEditMode && !focusMode && (
          <div className="absolute bottom-4 right-4 z-10 flex gap-2">
            <button
              onClick={handlePrevPage}
              className={`p-2 rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm hover:shadow transition-all ${
                settings.theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
              }`}
              title={t('reader.prevPage')}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextPage}
              className={`p-2 rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm hover:shadow transition-all ${
                settings.theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
              }`}
              title={t('reader.nextPage')}
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {!isEditMode && <ProgressBar />}
      </div>

      {/* Search Panel */}
      {!isEditMode && (
        <SearchPanel
          isOpen={isSearchOpen}
          onClose={() => {
            clearSearchHighlights()
            setSearchOpen(false)
            setSearchQuery('')
          }}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          currentIndex={currentSearchIndex}
          totalResults={totalSearchResults}
          onNext={() => navigateSearch('next')}
          onPrev={() => navigateSearch('prev')}
          theme={settings.theme}
        />
      )}

      <Settings />
    </div>
  )
}