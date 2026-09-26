import { useCallback, useEffect } from 'react'
import { useStore, Book } from '../store'

export function useBooks() {
  const {
    books,
    addBook,
    removeBook,
    updateBook,
    setCurrentBook,
    currentBook
  } = useStore()

  const importFile = useCallback(
    async (file: File) => {
      const content = await file.text()
      const title = file.name.replace(/\.(md|markdown|txt)$/i, '')
      addBook({
        title,
        path: file.name,
        lastRead: new Date().toISOString(),
        progress: 0,
        wordCount: content.length
      })
    },
    [addBook]
  )

  const importFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        if (/\.(md|markdown|txt)$/i.test(file.name)) {
          await importFile(file)
        }
      }
    },
    [importFile]
  )

  const openBook = useCallback(
    (book: Book) => {
      updateBook(book.id, { lastRead: new Date().toISOString() })
      setCurrentBook(book)
    },
    [updateBook, setCurrentBook]
  )

  const closeBook = useCallback(() => {
    setCurrentBook(null)
  }, [setCurrentBook])

  const deleteBook = useCallback(
    (id: string) => {
      removeBook(id)
    },
    [removeBook]
  )

  // Listen for file imports from Electron
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const unsubscribe = window.electronAPI.onFilesImported((files) => {
        files.forEach((file) => {
          const title = file.path.split('/').pop()?.replace(/\.(md|markdown|txt)$/i, '') || 'Untitled'
          addBook({
            title,
            path: file.path,
            lastRead: new Date().toISOString(),
            progress: 0,
            wordCount: file.content.length
          })
        })
      })
      return () => unsubscribe()
    }
  }, [addBook])

  return {
    books,
    currentBook,
    importFile,
    importFiles,
    openBook,
    closeBook,
    deleteBook
  }
}