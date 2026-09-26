interface FileData {
  path: string
  content: string
}

interface ElectronAPI {
  // Store operations
  getStore: (key: string) => Promise<unknown>
  setStore: (key: string, value: unknown) => Promise<boolean>
  deleteStore: (key: string) => Promise<boolean>

  // File operations
  importFile: () => Promise<void>
  importFolder: () => Promise<void>
  readFile: (filePath: string) => Promise<string>
  writeFile: (filePath: string, content: string) => Promise<void>
  checkFileExists: (filePath: string) => Promise<boolean>

  // Native dropped files must complete main-process authorization before import.
  importDroppedFile: (file: File) => Promise<
    { status: 'imported'; path: string; content: string } |
    { status: 'unavailable' | 'canceled' | 'failed' }
  >

  // Save dragged file content and return a valid path
  saveDraggedFile: (fileName: string, content: string) => Promise<string>

  // Clipboard operations
  writeClipboard: (text: string) => Promise<void>
  readClipboard: () => Promise<string>

  // Window controls
  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void
  setWindowTitle: (title: string) => void

  // Event listeners
  onFilesImported: (callback: (files: FileData[]) => void) => () => void
  onToggleDarkMode: (callback: () => void) => () => void
  onOpenSettings: (callback: () => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}