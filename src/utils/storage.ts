import type { PersistStorage, StorageValue } from 'zustand/middleware'

/** Batch metadata writes before JSON serialization, including during continuous scrolling. */
export function createBufferedStorage<S extends object>(delay = 500): PersistStorage<S> & { flush: () => void } {
  let pending: { name: string; value: StorageValue<S> } | null = null
  let previous: StorageValue<S> | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  const flush = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
    if (!pending) return
    try {
      localStorage.setItem(pending.name, JSON.stringify(pending.value))
      pending = null
    } catch (error) {
      // Keep the pending value for a later retry (for example after storage is freed).
      console.error('Failed to persist library:', error)
    }
  }
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush()
    })
  }
  return {
    flush,
    getItem: name => {
      try {
        const value = localStorage.getItem(name)
        return value ? JSON.parse(value) : null
      } catch { return null }
    },
    setItem: (name, value) => {
      const unchanged = previous?.version === value.version && Object.keys(value.state).every(key =>
        Object.is(previous?.state[key as keyof S], value.state[key as keyof S]))
      if (unchanged) return
      previous = value
      pending = { name, value }
      // A fixed deadline also persists progress when the user never stops scrolling.
      if (timer === null) timer = setTimeout(flush, delay)
    },
    removeItem: name => {
      if (timer !== null) clearTimeout(timer)
      timer = null
      pending = null
      previous = null
      localStorage.removeItem(name)
    }
  }
}

/**
 * Local storage wrapper with type safety
 */
export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Failed to remove from localStorage:', error)
    }
  },

  clear(): void {
    try {
      localStorage.clear()
    } catch (error) {
      console.error('Failed to clear localStorage:', error)
    }
  }
}

/**
 * Storage keys
 */
export const STORAGE_KEYS = {
  BOOKS: 'markdown-reader-books',
  SETTINGS: 'markdown-reader-settings',
  SCROLL_POSITIONS: 'markdown-reader-scroll-positions',
  RECENT_FILES: 'markdown-reader-recent-files',
  THEME: 'markdown-reader-theme'
} as const

/**
 * File system utilities (for Electron)
 */
export const fileSystem = {
  async readFile(path: string): Promise<string> {
    if (typeof window !== 'undefined' && window.electronAPI) {
      return window.electronAPI.readFile(path)
    }
    throw new Error('File system not available in browser')
  },

  async writeFile(path: string, content: string): Promise<void> {
    if (typeof window !== 'undefined' && window.electronAPI) {
      return window.electronAPI.writeFile(path, content)
    }
    throw new Error('File system not available in browser')
  },

  async importFile(): Promise<void> {
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.importFile()
    }
  },

  async importFolder(): Promise<void> {
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.importFolder()
    }
  }
}

/**
 * Debounce utility
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle utility
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}
