import { app, BrowserWindow, ipcMain, dialog, Menu, shell, clipboard } from 'electron'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import { readFile, writeFile, readdir, access, mkdir, rename, realpath } from 'node:fs/promises'
import { constants } from 'node:fs'
import { randomUUID } from 'node:crypto'
import * as iconv from 'iconv-lite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Bookmarks stay in the main process, separate from the renderer's key/value store.
interface FileBookmark {
  path: string
  kind: 'file' | 'directory'
  bookmark: string
}

const getStoragePath = () => path.join(app.getPath('userData'), 'app-storage.json')
const getBookmarkDirectory = () => path.join(app.getPath('userData'), 'security-scoped-access')
const getBookmarkPath = () => path.join(getBookmarkDirectory(), 'bookmarks.json')
const isMAS = () => process.platform === 'darwin' && process.mas === true
let storageCache: Record<string, unknown> = Object.create(null)
let fileBookmarks: FileBookmark[] = []
let appStorageLoad: Promise<void> | undefined
let bookmarkStorageLoad: Promise<void> | undefined
let persistenceQueue: Promise<void> = Promise.resolve()

async function readJSON(filePath: string, validate: (value: unknown) => boolean): Promise<unknown> {
  let raw: string
  try {
    raw = await readFile(filePath, 'utf-8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
  try {
    const value: unknown = JSON.parse(raw)
    if (!validate(value)) throw new Error('Invalid storage structure')
    return value
  } catch {
    // Keep corrupt data byte-for-byte beside the original, inside the same
    // protected directory for bookmarks. Never overwrite it with an empty file.
    const recoveryPath = `${filePath}.corrupt-${randomUUID()}`
    await rename(filePath, recoveryPath)
    dialog.showErrorBox('本地记录已恢复', '一份本地记录无法读取，原始内容已保留为同目录中的 .corrupt 备份。应用可继续使用；若文件权限记录受影响，请重新导入相应文件或文件夹。')
    return undefined
  }
}

function validBookmark(value: unknown): value is FileBookmark {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<FileBookmark>
  return typeof item.path === 'string' && path.isAbsolute(item.path) &&
    (item.kind === 'file' || item.kind === 'directory') &&
    typeof item.bookmark === 'string' && item.bookmark.length > 0
}

function loadAppStorage(): Promise<void> {
  if (!appStorageLoad) {
    appStorageLoad = (async () => {
      const stored = await readJSON(getStoragePath(), value => !!value && typeof value === 'object' && !Array.isArray(value))
      if (stored) storageCache = Object.assign(Object.create(null), stored)
    })().catch(error => {
      appStorageLoad = undefined
      throw error
    })
  }
  return appStorageLoad
}

function loadBookmarkStorage(): Promise<void> {
  if (!bookmarkStorageLoad) {
    bookmarkStorageLoad = (async () => {
      const stored = await readJSON(getBookmarkPath(), value => Array.isArray(value) && value.every(validBookmark))
      if (Array.isArray(stored)) fileBookmarks = stored.map(item => ({ ...item, path: path.resolve(item.path) }))
    })().catch(error => {
      bookmarkStorageLoad = undefined
      throw error
    })
  }
  return bookmarkStorageLoad
}

async function loadStorage(): Promise<void> {
  // Independent initialization: a settings failure cannot poison file access.
  await Promise.all([loadAppStorage(), loadBookmarkStorage()])
}

function persistJSON(filePath: string, value: unknown): Promise<void> {
  const payload = JSON.stringify(value, null, 2)
  // Serialize all writes. A failed write is reported to its caller but does not
  // poison later saves. Rename keeps the previous complete file on write failure.
  const write = persistenceQueue.catch(() => {}).then(async () => {
    await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 })
    const temporaryPath = `${filePath}.tmp`
    await writeFile(temporaryPath, payload, { encoding: 'utf-8', mode: 0o600 })
    await rename(temporaryPath, filePath)
  })
  persistenceQueue = write
  return write
}

function saveStorage(): Promise<void> {
  return persistJSON(getStoragePath(), storageCache)
}

function isSameOrDescendant(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate)
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`))
}

function findBookmark(filePath: string): FileBookmark | undefined {
  const normalized = path.resolve(filePath)
  return fileBookmarks
    .filter(entry => entry.path === normalized || (entry.kind === 'directory' && isSameOrDescendant(entry.path, normalized)))
    .sort((a, b) => b.path.length - a.path.length)[0]
}

function accessError(): Error {
  return new Error('文件访问权限已失效。请使用“导入文件”或“导入文件夹”重新选择原始文件后重试。')
}

async function resolvedPath(filePath: string): Promise<string> {
  try {
    return await realpath(filePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    // A write may recreate a deleted document; still resolve its parent to avoid
    // crossing an authorized directory through a symbolic link.
    return path.join(await realpath(path.dirname(filePath)), path.basename(filePath))
  }
}

async function assertDocumentPath(filePath: string): Promise<void> {
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) throw new Error('A local absolute file path is required')
  const privateDirectory = getBookmarkDirectory()
  if (isSameOrDescendant(privateDirectory, path.resolve(filePath))) throw new Error('Private application data cannot be opened as a document')
  const [actualPath, actualPrivateDirectory] = await Promise.all([
    resolvedPath(filePath),
    realpath(privateDirectory).catch(() => path.resolve(privateDirectory))
  ])
  if (isSameOrDescendant(actualPrivateDirectory, actualPath)) throw new Error('Private application data cannot be opened as a document')
}

async function withFileAccess<T>(filePath: string, operation: () => Promise<T>): Promise<T> {
  await loadBookmarkStorage()
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) throw new Error('A local absolute file path is required')
  const grant = isMAS() ? findBookmark(filePath) : undefined
  let stopAccessing: (() => void) | undefined
  try {
    if (grant) {
      try {
        stopAccessing = app.startAccessingSecurityScopedResource(grant.bookmark) as () => void
      } catch {
        // Electron can throw for stale bookmarks. Only a new native selection
        // can provide a replacement; never manufacture one from a renderer path.
        throw accessError()
      }
    }
    await assertDocumentPath(filePath)
    if (grant?.kind === 'directory') {
      const [root, target] = await Promise.all([realpath(grant.path), resolvedPath(filePath)])
      if (!isSameOrDescendant(root, target)) throw accessError()
    }
    // Legacy library entries have no bookmark: retain any existing OS access,
    // and ask the user to re-import only if that access has been revoked.
    return await operation()
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'EACCES' || code === 'EPERM') throw accessError()
    throw error
  } finally {
    stopAccessing?.()
  }
}

async function rememberDialogBookmarks(result: Electron.OpenDialogReturnValue, kind: FileBookmark['kind']): Promise<void> {
  if (result.canceled || !isMAS()) return
  await loadBookmarkStorage()
  const entries = result.filePaths.map((filePath, index): FileBookmark => {
    const bookmark = result.bookmarks?.[index]
    if (!bookmark) throw new Error('无法保存文件访问权限，请重新选择文件。')
    return { path: path.resolve(filePath), kind, bookmark }
  })
  // Merge synchronously before queueing writes, so simultaneous imports never
  // overwrite each other's entries. Bookmarks are never included in IPC output.
  // A fresh directory selection replaces its older descendant grants as well.
  // Otherwise a stale exact-file grant would shadow this valid parent grant.
  fileBookmarks = [...fileBookmarks.filter(existing => !entries.some(entry =>
    entry.path === existing.path || (entry.kind === 'directory' && isSameOrDescendant(entry.path, existing.path))
  )), ...entries]
  await persistJSON(getBookmarkPath(), fileBookmarks)
}

function reportImportError(error: unknown) {
  console.error('[Main] File import failed:', error instanceof Error ? error.message : 'unknown error')
  dialog.showErrorBox('无法打开文档', '无法读取文档或保存文件权限。请通过“导入文件”或“导入文件夹”重新选择原始位置。')
}

let mainWindow: BrowserWindow | null = null
let pendingFiles: string[] = []
let rendererReady = false
const pendingImports: { path: string; content: string }[][] = []

function sendImportedFiles(files: { path: string; content: string }[]) {
  pendingImports.push(files)
  flushImportedFiles()
}

function flushImportedFiles() {
  while (rendererReady && mainWindow && !mainWindow.isDestroyed() && pendingImports.length) {
    mainWindow.webContents.send('files-imported', pendingImports.shift()!)
  }
}

// 检测文件编码
function detectEncoding(buffer: Buffer, utf8Content?: string): string {
  // 检查 BOM
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return 'utf-8'
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return 'utf-16le'
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return 'utf-16be'
  }

  // 尝试 UTF-8 解码
  try {
    const decoded = utf8Content ?? buffer.toString('utf-8')
    // 检查是否有乱码字符
    const hasInvalidChars = /[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(decoded)
    if (!hasInvalidChars) {
      return 'utf-8'
    }
  } catch {
    // 继续检查其他编码
  }

  // 检查是否可能是 GBK/GB2312 (简体中文)
  // GBK 编码的汉字范围: 第一字节 0x81-0xFE, 第二字节 0x40-0xFE
  let gbkLikely = 0
  let utf8Likely = 0

  for (let i = 0; i < Math.min(buffer.length, 1000); i++) {
    const byte = buffer[i]

    // GBK 汉字判断
    if (byte >= 0x81 && byte <= 0xfe) {
      if (i + 1 < buffer.length) {
        const nextByte = buffer[i + 1]
        if ((nextByte >= 0x40 && nextByte <= 0x7e) || (nextByte >= 0x80 && nextByte <= 0xfe)) {
          gbkLikely++
          i++ // 跳过下一个字节
        }
      }
    }

    // UTF-8 多字节判断
    if ((byte & 0xc0) === 0xc0) {
      utf8Likely++
    }
  }

  // 如果检测到 GBK 特征，返回 GBK
  if (gbkLikely > utf8Likely && gbkLikely > 5) {
    return 'gbk'
  }

  // 默认返回 utf-8
  return 'utf-8'
}

// 读取文件并自动检测编码
async function readFileWithEncoding(filePath: string): Promise<string> {
  const buffer = await withFileAccess(filePath, () => readFile(filePath))
  // Most documents are UTF-8. Reuse the text produced for detection instead
  // of decoding the entire document twice, and strip its optional BOM once.
  const hasUTF16BOM = buffer.length >= 2 && (
    (buffer[0] === 0xff && buffer[1] === 0xfe) || (buffer[0] === 0xfe && buffer[1] === 0xff)
  )
  if (hasUTF16BOM) return iconv.decode(buffer, detectEncoding(buffer))
  const utf8Content = buffer.toString('utf-8', buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf ? 3 : 0)
  const encoding = detectEncoding(buffer, utf8Content)
  return encoding === 'utf-8' ? utf8Content : iconv.decode(buffer, encoding)
}

function openDocumentLink(url: string) {
  try {
    const protocol = new URL(url).protocol
    if (protocol === 'https:' || protocol === 'http:' || protocol === 'mailto:') {
      void shell.openExternal(url).catch(err => console.error('Failed to open link:', err))
    }
  } catch {
    // Ignore malformed and non-web links from document content.
  }
}

function createWindow() {
  rendererReady = false
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Markdown Reader',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      nodeIntegration: false,
      nodeIntegrationInSubFrames: false,
      webviewTag: false,
      contextIsolation: true,
      defaultEncoding: 'UTF-8',
      spellcheck: true,
      enableWebSQL: false,
      // MAS 构建需要关闭 Chromium 沙盒（使用 macOS 沙盒代替）
      sandbox: false,
    },
    backgroundColor: '#ffffff',
    show: false,
  })

  mainWindow = window

  // Open document links in the user's browser and keep the reader in place.
  // Remote pages must never inherit this window's file-system bridge.
  window.webContents.setWindowOpenHandler(({ url }) => {
    openDocumentLink(url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, url) => {
    event.preventDefault()
    openDocumentLink(url)
  })
  window.webContents.on('will-attach-webview', event => event.preventDefault())
  window.webContents.on('will-frame-navigate', details => {
    if (!details.isMainFrame) details.preventDefault()
  })

  // Paint the window while disk initialization proceeds independently. File
  // delivery waits for the preload subscription handshake, not page load.
  window.on('ready-to-show', () => window.show())
  window.webContents.on('did-start-loading', () => {
    if (mainWindow === window) rendererReady = false
  })
  window.webContents.on('did-finish-load', () => window.show())
  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null
      rendererReady = false
    }
  })

  // Log console messages from renderer
  window.webContents.on('console-message', (_event, _level, message) => {
    console.log('[Renderer]', message)
  })

  // Log any render process crashes
  window.webContents.on('render-process-gone', (_event, details) => {
    console.error('[Main] Render process gone:', details)
  })

  // Development
  const rendererURL = process.env.ELECTRON_RENDERER_URL
  if (!app.isPackaged && rendererURL) {
    window.loadURL(rendererURL).catch(console.error)
  } else {
    // Production: load from out/renderer/index.html
    const htmlPath = path.join(__dirname, '../renderer/index.html')
    console.log('[Main] Loading HTML from:', htmlPath)
    console.log('[Main] __dirname:', __dirname)
    window.loadFile(htmlPath).catch(err => {
      console.error('[Main] Failed to load HTML:', err)
    })
  }

  createMenu()
}

let processingPendingFiles = false

async function authorizeAssociatedFile(filePath: string): Promise<boolean> {
  if (!mainWindow) return false
  const result = await dialog.showOpenDialog(mainWindow, {
    defaultPath: filePath,
    properties: ['openFile'],
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }],
    securityScopedBookmarks: true,
    message: '请确认此文件，以便下次启动后继续阅读和编辑。'
  })
  if (result.canceled) return false
  if (result.filePaths.length !== 1 || path.resolve(result.filePaths[0]) !== path.resolve(filePath)) {
    throw new Error('请重新选择同一文件，或从“导入文件”打开其他文档。')
  }
  await rememberDialogBookmarks(result, 'file')
  return true
}

// An OS open-file event supplies only a path, not a persistent bookmark.
async function readAssociatedFile(filePath: string): Promise<string | undefined> {
  await loadBookmarkStorage()
  let authorized = false
  if (isMAS() && !findBookmark(filePath)) {
    if (!await authorizeAssociatedFile(filePath)) return undefined
    authorized = true
  }
  try {
    return await readFileWithEncoding(filePath)
  } catch (error) {
    if (!isMAS() || authorized) throw error
    if (!await authorizeAssociatedFile(filePath)) return undefined
    return readFileWithEncoding(filePath)
  }
}

// Drain each association exactly once even if events arrive during an import.
async function processPendingFiles() {
  if (processingPendingFiles || !rendererReady || !mainWindow || mainWindow.isDestroyed()) return
  processingPendingFiles = true
  try {
    while (pendingFiles.length && rendererReady && mainWindow && !mainWindow.isDestroyed()) {
      const filePath = pendingFiles.shift()!
      try {
        const content = await readAssociatedFile(filePath)
        if (content !== undefined) sendImportedFiles([{ path: filePath, content }])
      } catch (error) {
        reportImportError(error)
      }
    }
  } finally {
    processingPendingFiles = false
  }
}

// Handle file open from file association
async function handleFileOpen(filePath: string) {
  console.log('[Main] handleFileOpen:', filePath)
  if (!/\.(md|markdown|txt)$/i.test(filePath)) {
    console.log('[Main] File extension not supported')
    return
  }

  // Add to pending files
  pendingFiles.push(filePath)
  console.log('[Main] Added to pending files, total:', pendingFiles.length)

  // A macOS app can remain alive after its last window closes. Reopen it for
  // file associations, and let the new document subscribe before delivery.
  if ((!mainWindow || mainWindow.isDestroyed()) && app.isReady()) createWindow()
  if (rendererReady && mainWindow && !mainWindow.isDestroyed()) {
    console.log('[Main] Window ready, processing pending files')
    processPendingFiles()
    // Focus the window
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.focus()
  }
}

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin'
      ? [{ role: 'appMenu' as const }]
      : []),
    {
      label: '文件',
      submenu: [
        {
          label: '导入文件',
          accelerator: 'CmdOrCtrl+O',
          click: () => handleImportFile()
        },
        {
          label: '导入文件夹',
          click: () => handleImportFolder()
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: '设置',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow?.webContents.send('open-settings')
        },
        { type: 'separator' },
        { role: 'toggleDevTools' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

async function handleImportFile() {
  if (!mainWindow) return
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }],
      securityScopedBookmarks: true
    })
    if (result.canceled || result.filePaths.length === 0) return
    await rememberDialogBookmarks(result, 'file')
    const files = await readMarkdownFiles(result.filePaths)
    sendImportedFiles(files)
  } catch (error) {
    reportImportError(error)
  }
}

async function handleImportFolder() {
  if (!mainWindow) return
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      securityScopedBookmarks: true
    })
    if (result.canceled || result.filePaths.length === 0) return
    await rememberDialogBookmarks(result, 'directory')
    const files = await scanMarkdownFiles(result.filePaths[0])
    sendImportedFiles(files)
  } catch (error) {
    reportImportError(error)
  }
}

// Limit disk work for large imports: unbounded Promise.all can exhaust open
// descriptors, while serial reads force every file to wait for the previous one.
async function readMarkdownFiles(filePaths: string[]): Promise<{ path: string; content: string }[]> {
  const files = new Array<{ path: string; content: string }>(filePaths.length)
  let nextIndex = 0
  const results = await Promise.allSettled(Array.from({ length: Math.min(8, filePaths.length) }, async () => {
    while (nextIndex < filePaths.length) {
      const index = nextIndex++
      const filePath = filePaths[index]
      files[index] = { path: filePath, content: await readFileWithEncoding(filePath) }
    }
  }))
  const failed = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
  if (failed) throw failed.reason
  return files
}

async function scanMarkdownFiles(dirPath: string): Promise<{ path: string; content: string }[]> {
  const filePaths: string[] = []
  async function collect(directory: string): Promise<void> {
    const entries = await withFileAccess(directory, () => readdir(directory, { withFileTypes: true }))
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name)
      if (entry.isDirectory()) await collect(fullPath)
      else if (entry.isFile() && /\.(md|markdown|txt)$/i.test(entry.name)) filePaths.push(fullPath)
    }
  }
  await collect(dirPath)
  return readMarkdownFiles(filePaths)
}

// IPC Handlers - 使用自定义存储
// Every native capability is limited to the current reader document and its
// main frame. Checking only the WebContents would also trust nested frames.
function assertReaderSender(event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent) {
  if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) {
    throw new Error('Native access is restricted to the reader main frame')
  }
  const expectedURL = !app.isPackaged && process.env.ELECTRON_RENDERER_URL
    ? process.env.ELECTRON_RENDERER_URL
    : pathToFileURL(path.join(__dirname, '../renderer/index.html')).href
  try {
    const senderURL = new URL(event.senderFrame.url)
    const readerURL = new URL(expectedURL)
    senderURL.hash = ''
    readerURL.hash = ''
    if (senderURL.href === readerURL.href) return
  } catch { /* Missing or malformed frame URLs are not trusted. */ }
  throw new Error('Native access is restricted to the reader document')
}

function handleReaderIPC(channel: string, listener: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => unknown) {
  ipcMain.handle(channel, async (event, ...args) => {
    assertReaderSender(event)
    return listener(event, ...args)
  })
}

function onReaderIPC(channel: string, listener: (event: Electron.IpcMainEvent, ...args: any[]) => void) {
  ipcMain.on(channel, (event, ...args) => {
    try { assertReaderSender(event) } catch { return }
    listener(event, ...args)
  })
}

onReaderIPC('renderer-ready', () => {
  rendererReady = true
  flushImportedFiles()
  void processPendingFiles()
})

handleReaderIPC('get-store', async (_event, key: string) => {
  await loadAppStorage()
  return storageCache[key]
})

handleReaderIPC('set-store', async (_event, key: string, value: unknown) => {
  await loadAppStorage()
  storageCache[key] = value
  await saveStorage()
  return true
})

handleReaderIPC('delete-store', async (_event, key: string) => {
  await loadAppStorage()
  delete storageCache[key]
  await saveStorage()
  return true
})

handleReaderIPC('clipboard-write-text', async (_event, text: string) => {
  if (typeof text !== 'string') throw new Error('Clipboard text must be a string')
  await clipboard.writeText(text)
})

handleReaderIPC('clipboard-read-text', async () => {
  return clipboard.readText()
})

handleReaderIPC('import-file', handleImportFile)
handleReaderIPC('import-folder', handleImportFolder)

// Dragged native files use the same MAS authorization flow as OS open-file.
// Cancellation is explicit so the renderer cannot fall back to an unapproved path.
handleReaderIPC('import-dropped-file', async (_event, filePath: string) => {
  try {
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath) || !/\.(md|markdown|txt)$/i.test(filePath)) {
      throw new Error('Invalid dropped document path')
    }
    const content = await readAssociatedFile(filePath)
    return content === undefined ? { status: 'canceled' } : { status: 'imported', path: filePath, content }
  } catch (error) {
    reportImportError(error)
    return { status: 'failed' }
  }
})

handleReaderIPC('read-file', async (_event, filePath: string) => {
  return readFileWithEncoding(filePath)
})

handleReaderIPC('write-file', async (_event, filePath: string, content: string) => {
  return withFileAccess(filePath, () => writeFile(filePath, content, 'utf-8'))
})

// Check if file exists
handleReaderIPC('check-file-exists', async (_event, filePath: string) => {
  try {
    await withFileAccess(filePath, () => access(filePath, constants.F_OK))
    return true
  } catch {
    return false
  }
})

// Save dragged file content and return a valid path
handleReaderIPC('save-dragged-file', async (_event, fileName: string, content: string) => {
  // Save to user data directory
  const userDataPath = app.getPath('userData')
  const draggedFilesDir = path.join(userDataPath, 'dragged-files')

  // Ensure directory exists
  await mkdir(draggedFilesDir, { recursive: true })

  // Treat the bridge argument as a filename, never a path into app storage.
  if (typeof fileName !== 'string' || typeof content !== 'string') throw new Error('Invalid dropped file')
  const safeFileName = `${randomUUID()}-${path.basename(fileName.replace(/\\/g, '/'))}`
  const filePath = path.join(draggedFilesDir, safeFileName)

  // Write file
  await writeFile(filePath, content, { encoding: 'utf-8', flag: 'wx', mode: 0o600 })
  console.log('[Main] Saved dragged file to:', filePath)

  return filePath
})

// Handle drag-drop file path resolution
handleReaderIPC('get-file-path', async (_event, filePath: string) => {
  // This is used when webUtils is not available in renderer
  // The filePath should already be absolute from the File object
  return filePath
})

onReaderIPC('window-minimize', () => mainWindow?.minimize())
onReaderIPC('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
onReaderIPC('window-close', () => mainWindow?.close())
onReaderIPC('window-set-title', (_event, title: string) => {
  if (mainWindow) {
    mainWindow.setTitle(title)
  }
})

// Single instance lock - for file association on Windows/Linux
// 设置应用语言 (必须在 app.ready 之前)
app.commandLine.appendSwitch('lang', 'zh-CN')

// MAS 构建必需：禁用 Chromium 沙盒相关的警告
app.commandLine.appendSwitch('disable-electron-sandbox-warnings')

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  // Handle second instance (Windows/Linux) - when app is already running and user opens file
  app.on('second-instance', async (_event, commandLine) => {
    // Find the file path from command line arguments
    const filePath = commandLine.find(arg => /\.(md|markdown|txt)$/i.test(arg))
    if (filePath) {
      await handleFileOpen(filePath)
    }
  })

  app.whenReady().then(() => {
    createWindow()
    // IPC and document reads share these initialization promises when needed;
    // a slow settings file must not delay window creation or the first paint.
    void loadStorage().catch(err => console.error('[Main] Failed to load storage:', err))
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// Handle file open events (macOS) - must be registered before app.whenReady()
app.on('open-file', async (event, filePath) => {
  event.preventDefault()
  console.log('[Main] open-file event:', filePath)
  await handleFileOpen(filePath)
})

// Handle command line arguments for file associations (Windows/Linux startup)
if (process.platform !== 'darwin') {
  const filePath = process.argv.find(arg => /\.(md|markdown|txt)$/i.test(arg))
  if (filePath) {
    pendingFiles.push(filePath)
  }
}
