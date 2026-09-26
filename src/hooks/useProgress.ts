import { useCallback, useRef, useEffect } from 'react'
import { useStore } from '../store'

export function useProgress(bookId: string | undefined) {
  const { updateProgress, scrollPositions, setScrollPosition } = useStore()
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const saveProgress = useCallback(
    (progress: number, position: number) => {
      if (!bookId) return

      // Debounce saving
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        updateProgress(bookId, progress)
        setScrollPosition(bookId, position)
      }, 300)
    },
    [bookId, updateProgress, setScrollPosition]
  )

  const getSavedPosition = useCallback(() => {
    if (!bookId) return 0
    return scrollPositions[bookId] || 0
  }, [bookId, scrollPositions])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    saveProgress,
    getSavedPosition
  }
}