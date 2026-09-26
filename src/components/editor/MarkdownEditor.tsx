import { useEffect, useCallback, useState, useRef, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extension-placeholder'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Link } from '@tiptap/extension-link'
import { Image } from '@tiptap/extension-image'
import { Highlight } from '@tiptap/extension-highlight'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { Typography } from '@tiptap/extension-typography'
import { common, createLowlight } from 'lowlight'
import { Markdown } from 'tiptap-markdown'
import { useStore, TableFormatInfo } from '../../store'
import EditorToolbar from './EditorToolbar'
import TableBubbleMenu from './TableBubbleMenu'
import SearchPanel from '../common/SearchPanel'
import { SearchExtension, setSearchQuery as setEditorSearchQuery, clearSearchQuery, getSearchResults } from './SearchExtension'
import { Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { detectTableFormats, restoreTableFormats } from '../../utils/markdown'
import { t } from '../../i18n'

const lowlight = createLowlight(common)

export default function MarkdownEditor() {
  const {
    currentBook,
    currentContent,
    editedContent,
    setEditedContent,
    saveContent,
    hasUnsavedChanges,
    isSaving,
    settings,
    isEditMode,
    setEditMode,
    isSearchOpen,
    setSearchOpen,
    searchQuery,
    setSearchQuery,
    currentSearchIndex,
    setCurrentSearchIndex,
    setOriginalContent,
    tableFormats,
    setTableFormats
  } = useStore()

  const [showSaveNotification, setShowSaveNotification] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [searchResultsCount, setSearchResultsCount] = useState(0)
  const isExternalUpdate = useRef(false)
  const lastTitleRef = useRef<string>('')
  const tableFormatsRef = useRef<TableFormatInfo[]>([])

  // Keep ref in sync with state
  useEffect(() => {
    tableFormatsRef.current = tableFormats
  }, [tableFormats])

  // Memoize title to prevent recalculation
  const windowTitle = useMemo(() => {
    return currentBook ? `Markdown Reader - ${currentBook.title}` : 'Markdown Reader'
  }, [currentBook])

  // Set window title in edit mode - only when title changes
  useEffect(() => {
    if (windowTitle !== lastTitleRef.current) {
      lastTitleRef.current = windowTitle
      document.title = windowTitle
      if (window.electronAPI?.setWindowTitle) {
        window.electronAPI.setWindowTitle(windowTitle)
      }
    }
  }, [windowTitle])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
        codeBlock: false,
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Placeholder.configure({
        placeholder: t(settings.locale, 'editor.placeholder'),
      }),
      Typography,
      Markdown.configure({
        html: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'editor-table',
        },
      }),
      TableRow,
      TableCell,
      TableHeader,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline cursor-pointer hover:text-blue-600',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full rounded-lg',
        },
      }),
      Highlight.configure({
        multicolor: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'bg-gray-100 dark:bg-gray-800 rounded-lg p-4 font-mono text-sm overflow-x-auto',
        },
      }),
      SearchExtension.configure({
        searchQuery: '',
        currentIndex: 0,
      }),
    ],
    content: editedContent,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-full editor-content',
        style: `font-size: ${settings.fontSize}px; line-height: ${settings.lineHeight}; font-family: ${
          settings.fontFamily === 'serif' ? '"Songti SC", "Songti TC", "STSong", "Times New Roman", serif' :
          settings.fontFamily === 'mono' ? '"Menlo", "Monaco", "Consolas", monospace' :
          '"PingFang SC", "PingFang TC", "PingFang HK", "Helvetica Neue", sans-serif'
        }`,
      },
      handlePaste: (view, event) => {
        // 检查是否在表格内
        const { state } = view
        const { $from } = state.selection

        // 查找当前是否在表格节点内
        const isInTable = Array.from({ length: $from.depth + 1 }, (_, depth) => $from.node(depth))
          .some(node => ['table', 'tableRow', 'tableCell', 'tableHeader'].includes(node.type.name))

        if (isInTable) {
          // 获取粘贴的内容
          const clipboardData = event.clipboardData
          if (clipboardData) {
            const html = clipboardData.getData('text/html')
            const text = clipboardData.getData('text/plain')

            // 检查粘贴内容是否包含表格
            const hasTable = (html && /<table/i.test(html)) ||
                            (text && /^\|.*\|$/m.test(text))

            if (hasTable) {
              // 阻止粘贴并提示
              event.preventDefault()
              const locale = settings.locale
              alert(t(locale, 'editor.pasteTableTitle') + '\n\n' + t(locale, 'editor.pasteTableMessage'))
              return true
            }
          }
        }

        // 默认粘贴行为
        return false
      },
    },
    onUpdate: ({ editor }) => {
      if (!isExternalUpdate.current) {
        let markdown = editor.storage.markdown.getMarkdown()
        // Restore original table formats
        if (tableFormatsRef.current.length > 0) {
          markdown = restoreTableFormats(markdown, tableFormatsRef.current)
        }
        setEditedContent(markdown)
      }
    },
    immediatelyRender: false,
  })

  // Sync content when entering edit mode
  useEffect(() => {
    if (editor && currentBook && !hasUnsavedChanges) {
      isExternalUpdate.current = true
      editor.commands.setContent(currentContent)
      // Detect table formats in original content
      const formats = detectTableFormats(currentContent)
      setOriginalContent(currentContent)
      setTableFormats(formats)
      isExternalUpdate.current = false
    }
  }, [editor, currentBook?.id, currentContent])

  // Update editor style when settings change
  useEffect(() => {
    if (editor) {
      editor.setOptions({
        editorProps: {
          attributes: {
            class: 'prose prose-lg max-w-none focus:outline-none min-h-full editor-content',
            style: `font-size: ${settings.fontSize}px; line-height: ${settings.lineHeight}; font-family: ${
              settings.fontFamily === 'serif' ? '"Noto Serif SC", "Source Han Serif SC", serif' :
              settings.fontFamily === 'mono' ? '"JetBrains Mono", monospace' :
              '"Noto Sans SC", "Source Han Sans SC", sans-serif'
            }`,
          },
        },
      })
    }
  }, [editor, settings.fontSize, settings.lineHeight, settings.fontFamily])

  // Search functionality
  const performEditorSearch = useCallback((query: string, index: number = 0) => {
    if (!editor) return

    if (!query) {
      clearSearchQuery(editor.view)
      setSearchResultsCount(0)
      return
    }

    setEditorSearchQuery(editor.view, query, index)
    const results = getSearchResults(editor.view)
    setSearchResultsCount(results)
  }, [editor])

  const handleSearchNext = useCallback(() => {
    if (searchResultsCount === 0 || !editor) return
    const nextIndex = (currentSearchIndex + 1) % searchResultsCount
    setCurrentSearchIndex(nextIndex)
    setEditorSearchQuery(editor.view, searchQuery, nextIndex)
  }, [searchResultsCount, currentSearchIndex, editor, setCurrentSearchIndex, searchQuery])

  const handleSearchPrev = useCallback(() => {
    if (searchResultsCount === 0 || !editor) return
    const prevIndex = (currentSearchIndex - 1 + searchResultsCount) % searchResultsCount
    setCurrentSearchIndex(prevIndex)
    setEditorSearchQuery(editor.view, searchQuery, prevIndex)
  }, [searchResultsCount, currentSearchIndex, editor, setCurrentSearchIndex, searchQuery])

  const handleSearchClose = useCallback(() => {
    if (editor) {
      clearSearchQuery(editor.view)
    }
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResultsCount(0)
    setCurrentSearchIndex(0)
  }, [editor, setSearchOpen, setSearchQuery, setCurrentSearchIndex])

  // Perform search when query changes in edit mode
  useEffect(() => {
    if (isEditMode && isSearchOpen && editor && searchQuery !== undefined) {
      performEditorSearch(searchQuery, currentSearchIndex)
    }
  }, [searchQuery, isSearchOpen, isEditMode, editor, currentSearchIndex, performEditorSearch])

  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges || !editor || useStore.getState().isSaving) return
    setSaveError(false)
    setShowSaveNotification(false)
    try {
      let markdown = editor.storage.markdown.getMarkdown()
      if (tableFormatsRef.current.length > 0) {
        markdown = restoreTableFormats(markdown, tableFormatsRef.current)
      }
      setEditedContent(markdown)
      await saveContent()
      setShowSaveNotification(true)
      setTimeout(() => setShowSaveNotification(false), 2000)
    } catch (error) {
      console.error('Failed to save document:', error)
      setSaveError(true)
    }
  }, [hasUnsavedChanges, saveContent, editor, setEditedContent])

  const handleExit = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(t(settings.locale, 'editor.unsavedChanges'))
      if (!confirmLeave) return
    }
    setEditMode(false)
  }, [hasUnsavedChanges, setEditMode, settings.locale])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'

      // When search is open, only allow specific keys
      if (isSearchOpen) {
        // ESC closes search
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          handleSearchClose()
          return
        }
        // Allow Cmd/Ctrl+A to select all in search input
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
          return // Let browser handle
        }
        // Allow Cmd/Ctrl+C/V/X in search input
        if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
          return // Let browser handle
        }
        // CMD+F to toggle search off
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
          e.preventDefault()
          handleSearchClose()
          return
        }
        // Enter navigates results when not in input
        if (e.key === 'Enter' && !isInputFocused) {
          e.preventDefault()
          if (e.shiftKey) {
            handleSearchPrev()
          } else {
            handleSearchNext()
          }
          return
        }
        // Block all other global shortcuts when search is open
        return
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        handleExit()
        return
      }

      // Cmd/Ctrl+C - Copy using Electron clipboard if selection exists
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        const selection = window.getSelection()
        if (selection && selection.toString().length > 0) {
          const text = selection.toString()
          if (window.electronAPI?.writeClipboard) {
            void window.electronAPI.writeClipboard(text).catch(error => console.error('Failed to copy:', error))
          }
        }
        return
      }

      // Allow paste/cut/select-all to work normally
      if ((e.ctrlKey || e.metaKey) && ['v', 'x', 'a'].includes(e.key.toLowerCase())) {
        return
      }

      // Cmd/Ctrl+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
        return
      }

      // Cmd/Ctrl+F to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setSearchOpen(true)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasUnsavedChanges, handleSave, isSearchOpen, handleSearchNext, handleSearchPrev, handleSearchClose, setSearchOpen, handleExit])

  if (!currentBook || !editor) return null

  // Theme classes for the editor container
  const themeClasses = {
    light: 'bg-white text-gray-900',
    dark: 'bg-gray-900 text-gray-100 prose-invert',
    sepia: 'bg-amber-50 text-amber-950',
  }

  return (
    <div className={`h-full flex flex-col ${themeClasses[settings.theme]}`}>
      {/* Editor toolbar */}
      <EditorToolbar
        editor={editor}
        onSave={handleSave}
        onExit={handleExit}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        bookTitle={currentBook.title}
        theme={settings.theme}
      />

      {saveError && (
        <div role="alert" className="border-b border-red-300 bg-red-50 px-6 py-3 text-sm text-red-800">
          {t(settings.locale, 'editor.saveFailed')}
        </div>
      )}

      {/* Editor content */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar p-8 ${
        settings.theme === 'dark' ? 'prose-invert' : ''
      }`}>
        <div
          className="mx-auto"
          style={{
            maxWidth: settings.pageWidth,
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Table right-click menu */}
      <TableBubbleMenu editor={editor} theme={settings.theme} />

      {/* Search Panel */}
      <SearchPanel
        isOpen={isSearchOpen}
        onClose={handleSearchClose}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        currentIndex={currentSearchIndex}
        totalResults={searchResultsCount}
        onNext={handleSearchNext}
        onPrev={handleSearchPrev}
        theme={settings.theme}
      />

      {/* Save notification */}
      <AnimatePresence>
        {showSaveNotification && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
              settings.theme === 'dark' ? 'bg-green-600 text-white' : 'bg-green-500 text-white'
            }`}
          >
            <Check className="w-4 h-4" />
            {t(settings.locale, 'editor.saved')}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}