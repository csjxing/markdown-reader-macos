const { contextBridge, ipcRenderer } = require('electron')

// 安全获取 webUtils（MAS 构建中可能不可用）
let webUtils = null
try {
  webUtils = require('electron').webUtils
} catch (e) {
  console.warn('[Preload] webUtils not available:', e.message)
}

// Debug: log webUtils availability
console.log('[Preload] webUtils available:', !!webUtils)
console.log('[Preload] webUtils.getPathForFile available:', webUtils && typeof webUtils.getPathForFile === 'function')

// Types for IPC communication
/**
 * @typedef {Object} FileData
 * @property {string} path
 * @property {string} content
 */

// Keep the native listener alive across React StrictMode effect teardown and
// remount. Imports arriving in that gap are replayed to the next subscriber.
const fileImportListeners = new Set()
const pendingFileImports = []
ipcRenderer.on('files-imported', (_event, files) => {
  if (fileImportListeners.size === 0) pendingFileImports.push(files)
  else for (const callback of [...fileImportListeners]) callback(files)
})

const electronAPI = {
  // Store operations
  getStore: (key) => ipcRenderer.invoke('get-store', key),
  setStore: (key, value) => ipcRenderer.invoke('set-store', key, value),
  deleteStore: (key) => ipcRenderer.invoke('delete-store', key),

  // File operations
  importFile: () => ipcRenderer.invoke('import-file'),
  importFolder: () => ipcRenderer.invoke('import-folder'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  checkFileExists: (filePath) => ipcRenderer.invoke('check-file-exists', filePath),

  // Electron 32+ removed File.path. Resolve native File objects in preload,
  // then let main capture persistent MAS authorization before returning content.
  importDroppedFile: async (file) => {
    const filePath = webUtils?.getPathForFile(file)
    if (!filePath) return { status: 'unavailable' }
    return ipcRenderer.invoke('import-dropped-file', filePath)
  },

  // Save dragged file content and return a valid path
  saveDraggedFile: (fileName, content) => {
    return ipcRenderer.invoke('save-dragged-file', fileName, content)
  },

  // Electron 44 clipboard methods are asynchronous and available in main.
  writeClipboard: (text) => ipcRenderer.invoke('clipboard-write-text', text),
  readClipboard: () => ipcRenderer.invoke('clipboard-read-text'),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  setWindowTitle: (title) => ipcRenderer.send('window-set-title', title),

  // Event listeners
  onFilesImported: (callback) => {
    fileImportListeners.add(callback)
    while (pendingFileImports.length) callback(pendingFileImports.shift())
    // Main can now deliver startup associations without a guessed delay.
    ipcRenderer.send('renderer-ready')
    return () => fileImportListeners.delete(callback)
  },
  onToggleDarkMode: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('toggle-dark-mode', handler)
    return () => ipcRenderer.removeListener('toggle-dark-mode', handler)
  },
  onOpenSettings: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('open-settings', handler)
    return () => ipcRenderer.removeListener('open-settings', handler)
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)