// Main-process regression checks run against real temporary files and a mocked
// Electron boundary. No GUI, credentials, or user library are touched.
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const vm = require('node:vm')
const ts = require('typescript')
const iconv = require('iconv-lite')
const { randomUUID } = require('node:crypto')
const { pathToFileURL } = require('node:url')

async function run() {
  const source = (await fs.readFile(path.join(__dirname, '../electron/main.ts'), 'utf8'))
    .replace(/^import .*\n/gm, '')
    .replace(/^const __dirname = .*\n/m, '')
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS }
  }).outputText
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-main-check-'))
  const userData = path.join(temp, 'user-data')
  const calls = [], links = [], starts = [], stops = [], dialogs = [], sent = [], errors = []
  const handlers = new Map()
  const sendHandlers = new Map()
  let context
  const readerEvent = () => {
    const sender = vm.runInContext('mainWindow.webContents', context)
    return { sender, senderFrame: sender.mainFrame }
  }
  const invoke = (channel, ...args) => handlers.get(channel)(readerEvent(), ...args)
  const active = new Map()
  const protectedPaths = new Set()
  let clipboardText = ''
  const clipboard = { writeText: async text => { clipboardText = text }, readText: async () => clipboardText }
  const requireActiveScope = filePath => {
    if (protectedPaths.has(filePath)) assert.ok([...active.values()].some(count => count > 0), `I/O must run while scope is active: ${filePath}`)
  }
  let dialogResult = { canceled: true, filePaths: [] }
  let stale = new Set()
  class Window {
    constructor() {
      this.events = new Map()
      this.webContents = {
        on: (name, callback) => this.events.set(name, callback),
        send(...args) { sent.push(args) },
        setWindowOpenHandler: handler => { this.openHandler = handler },
        mainFrame: { url: '' }, isLoading: () => false
      }
    }
    on(name, callback) { this.events.set(name, callback) }
    show() { this.shown = true }
    focus() {}
    isMinimized() { return false }
    isDestroyed() { return !!this.destroyed }
    loadURL(url) { this.webContents.mainFrame.url = url; calls.push(['url', url]); return Promise.resolve() }
    loadFile(file) { this.webContents.mainFrame.url = pathToFileURL(file).href; calls.push(['file', file]); return Promise.resolve() }
  }
  const createContext = (mas = false, autoCreate = true) => {
    const readyCallbacks = []
    const appEvents = new Map()
    const context = vm.createContext({
      __dirname: '/test/out/main', path, pathToFileURL, Buffer, iconv, URL, randomUUID, clipboard,
      shell: { openExternal: async url => { links.push(url) } },
      readFile: async (...args) => { requireActiveScope(args[0]); return fs.readFile(...args) },
      writeFile: async (...args) => { requireActiveScope(args[0]); return fs.writeFile(...args) },
      readdir: async (...args) => { requireActiveScope(args[0]); return fs.readdir(...args) },
      access: async (...args) => { requireActiveScope(args[0]); return fs.access(...args) }, mkdir: fs.mkdir, rename: fs.rename, realpath: fs.realpath,
      constants: require('node:fs').constants,
      app: { isPackaged: false, commandLine: { appendSwitch() {} },
        requestSingleInstanceLock: () => true, on(name, callback) { appEvents.set(name, callback) },
        isReady: () => true,
        whenReady: () => ({ then(callback) { readyCallbacks.push(callback) } }), getPath: () => userData,
        startAccessingSecurityScopedResource(bookmark) {
          if (stale.has(bookmark)) throw new Error('bookmarkDataIsStale')
          starts.push(bookmark)
          active.set(bookmark, (active.get(bookmark) || 0) + 1)
          let stopped = false
          return () => {
            assert.equal(stopped, false, 'every acquired scope is released once')
            stopped = true
            stops.push(bookmark)
            active.set(bookmark, active.get(bookmark) - 1)
          }
        }
      },
      BrowserWindow: Window,
      ipcMain: { handle(name, handler) { handlers.set(name, handler) }, on(name, handler) { sendHandlers.set(name, handler) } },
      dialog: { showOpenDialog: async (_win, options) => { dialogs.push(options); return dialogResult },
        showErrorBox: (...args) => errors.push(args) },
      Menu: { buildFromTemplate() {}, setApplicationMenu() {} },
      process: { platform: 'darwin', mas, argv: [], env: {} },
      console: { log() {}, error() {} },
    })
    vm.runInContext(code, context)
    if (autoCreate) context.createWindow()
    context.readyCallbacks = readyCallbacks
    context.appEvents = appEvents
    return context
  }
  const waitFor = async condition => {
    for (let i = 0; i < 1000 && !condition(); i++) await new Promise(resolve => setTimeout(resolve, 1))
    assert.ok(condition(), 'asynchronous operation completes')
  }
  const selection = (filePath, bookmark) => ({ canceled: false, filePaths: [filePath], bookmarks: [bookmark] })
  const ensureBalanced = () => {
    assert.equal(starts.length, stops.length, 'all scopes released after operations settle')
    for (const count of active.values()) assert.equal(count, 0)
  }
  try {
    await fs.mkdir(userData, { recursive: true })
    context = createContext()
    const expected = '# 中文标题\n\nHello, reader.'
    for (const encoding of ['utf-8', 'utf-16le', 'utf-16be']) {
      const file = path.join(temp, encoding + '.md')
      await fs.writeFile(file, iconv.encode(expected, encoding, { addBOM: true }))
      assert.equal(await context.readFileWithEncoding(file), expected, encoding + ' with BOM')
    }
    const plain = path.join(temp, 'plain.md')
    await fs.writeFile(plain, expected)
    assert.equal(await context.readFileWithEncoding(plain), expected)
    const gbkFile = path.join(temp, 'legacy-gbk.md')
    const gbkText = '这是用于验证中文编码自动识别的测试文档。'
    await fs.writeFile(gbkFile, iconv.encode(gbkText, 'gbk'))
    assert.equal(await context.readFileWithEncoding(gbkFile), gbkText, 'legacy GBK remains supported')
    const decodeRead = context.readFile
    let utf8Decodes = 0
    context.readFile = async (...args) => {
      const buffer = await decodeRead(...args)
      if (args[0] === plain) {
        const decode = buffer.toString.bind(buffer)
        buffer.toString = (...parameters) => { utf8Decodes++; return decode(...parameters) }
      }
      return buffer
    }
    assert.equal(await context.readFileWithEncoding(plain), expected)
    assert.equal(utf8Decodes, 1, 'UTF-8 detection and rendering share a single full-document decode')
    context.readFile = decodeRead
    const empty = path.join(temp, 'empty.md')
    await fs.writeFile(empty, '')
    assert.equal(await context.readFileWithEncoding(empty), '')
    await assert.rejects(() => context.readFileWithEncoding(path.join(temp, 'missing.md')))
    for (const url of ['https://example.com', 'http://example.com', 'mailto:reader@example.com', 'file:///etc/passwd', 'javascript:alert(1)', 'data:text/html,hello', 'not a URL']) context.openDocumentLink(url)
    assert.deepEqual(links, ['https://example.com', 'http://example.com', 'mailto:reader@example.com'])
    context.createWindow()
    assert.deepEqual(calls.pop(), ['file', '/test/out/renderer/index.html'])
    context.process.env.ELECTRON_RENDERER_URL = 'http://localhost:5199'
    context.createWindow()
    assert.deepEqual(calls.pop(), ['url', 'http://localhost:5199'])
    context.app.isPackaged = true
    context.createWindow()
    assert.deepEqual(calls.pop(), ['file', '/test/out/renderer/index.html'])

    // Startup never waits for either JSON file before loading the renderer.
    context = createContext(false, false)
    const startupRead = context.readFile
    let releaseStartup
    const startupGate = new Promise(resolve => { releaseStartup = resolve })
    context.readFile = async (...args) => { await startupGate; return startupRead(...args) }
    const loadsBeforeStartup = calls.length
    context.readyCallbacks[0]()
    assert.equal(calls.length, loadsBeforeStartup + 1, 'window begins loading while storage is blocked')
    releaseStartup()
    await context.loadStorage()
    context.readFile = startupRead

    // did-finish-load may run before React subscribes. Queue associations until
    // the trusted preload handshake, then deliver each file exactly once.
    const sentBeforeReady = sent.length
    await context.handleFileOpen(plain)
    const startingWindow = vm.runInContext('mainWindow', context)
    startingWindow.events.get('ready-to-show')()
    assert.equal(startingWindow.shown, true, 'window can paint before file subscription')
    startingWindow.events.get('did-finish-load')()
    assert.equal(sent.length, sentBeforeReady, 'page load alone cannot consume pending files')
    const initialSender = readerEvent()
    sendHandlers.get('renderer-ready')({ ...initialSender, senderFrame: { url: initialSender.senderFrame.url } })
    sendHandlers.get('renderer-ready')({ ...initialSender, sender: {} })
    const initialURL = initialSender.senderFrame.url
    initialSender.senderFrame.url = 'https://example.com'
    sendHandlers.get('renderer-ready')(initialSender)
    initialSender.senderFrame.url = initialURL
    assert.equal(vm.runInContext('rendererReady', context), false, 'child frames, remote pages and other windows cannot release queued files')
    assert.equal(sent.length, sentBeforeReady)
    sendHandlers.get('renderer-ready')(readerEvent())
    await waitFor(() => sent.length > sentBeforeReady)
    assert.equal(sent.length, sentBeforeReady + 1)
    assert.equal(sent.at(-1)[1][0].content, expected)
    sendHandlers.get('renderer-ready')(readerEvent())
    await context.processPendingFiles()
    assert.equal(sent.length, sentBeforeReady + 1, 'repeated handshake never reimports a file')
    startingWindow.destroyed = true
    startingWindow.events.get('closed')()
    const loadsBeforeAssociation = calls.length
    await context.handleFileOpen(empty)
    assert.equal(calls.length, loadsBeforeAssociation + 1, 'association reopens a closed macOS window')
    assert.equal(sent.length, sentBeforeReady + 1)
    sendHandlers.get('renderer-ready')(readerEvent())
    await waitFor(() => sent.length === sentBeforeReady + 2)
    assert.equal(sent.at(-1)[1][0].content, '', 'empty associations still deliver after readiness')

    // An in-flight association survives a renderer reload: retain its content
    // until the replacement document subscribes instead of sending into a gap.
    const associationRead = context.readFile
    let releaseAssociation, readingAssociation = false
    const associationGate = new Promise(resolve => { releaseAssociation = resolve })
    context.readFile = async (...args) => {
      if (args[0] === plain) { readingAssociation = true; await associationGate }
      return associationRead(...args)
    }
    await context.handleFileOpen(plain)
    await waitFor(() => readingAssociation)
    const reloadingWindow = vm.runInContext('mainWindow', context)
    reloadingWindow.events.get('did-start-loading')()
    releaseAssociation()
    await waitFor(() => !vm.runInContext('processingPendingFiles', context))
    assert.equal(sent.length, sentBeforeReady + 2, 'reload holds decoded content until the next handshake')
    sendHandlers.get('renderer-ready')(readerEvent())
    assert.equal(sent.length, sentBeforeReady + 3)
    assert.equal(sent.at(-1)[1][0].content, expected)
    context.readFile = associationRead

    // Non-MAS builds return no bookmarks and retain normal file operations.
    await context.rememberDialogBookmarks({ canceled: false, filePaths: [plain], bookmarks: [] }, 'file')
    assert.equal(starts.length, 0)
    context.process.mas = true
    await context.rememberDialogBookmarks(selection(plain, 'file-bookmark'), 'file')
    protectedPaths.add(plain)
    assert.equal(await context.readFileWithEncoding(plain), expected)
    assert.equal(starts.at(-1), 'file-bookmark')
    assert.equal(await invoke('check-file-exists', plain), true)
    await invoke('write-file', plain, 'updated')
    assert.equal(await fs.readFile(plain, 'utf8'), 'updated')
    ensureBalanced()

    // New process context demonstrates the bookmark was actually persisted.
    context = createContext(true)
    assert.equal(await context.readFileWithEncoding(plain), 'updated')
    assert.equal(starts.at(-1), 'file-bookmark')
    await assert.rejects(() => context.withFileAccess(plain, async () => { throw new Error('disk full') }), /disk full/)
    ensureBalanced()
    stale.add('file-bookmark')
    let attempted = false
    await assert.rejects(() => context.withFileAccess(plain, async () => { attempted = true }), /重新选择/)
    assert.equal(attempted, false, 'stale scope never runs file I/O')
    ensureBalanced()
    stale.clear()

    // A directory bookmark covers children, not similarly-prefixed siblings or '..'.
    const folder = path.join(temp, 'notes')
    const nested = path.join(folder, 'nested')
    const sibling = path.join(temp, 'notes-private')
    await fs.mkdir(nested, { recursive: true }); await fs.mkdir(sibling)
    const child = path.join(nested, 'child.md')
    await fs.writeFile(child, 'inside'); await fs.writeFile(path.join(sibling, 'secret.md'), 'outside')
    await context.rememberDialogBookmarks(selection(folder, 'directory-bookmark'), 'directory')
    protectedPaths.add(folder); protectedPaths.add(nested); protectedPaths.add(child)
    assert.equal(await context.readFileWithEncoding(child), 'inside')
    assert.equal(starts.at(-1), 'directory-bookmark')
    assert.equal(context.findBookmark(path.join(sibling, 'secret.md')), undefined)
    assert.equal(context.findBookmark(path.join(folder, '..', 'notes-private', 'secret.md')), undefined)
    const scanned = await context.scanMarkdownFiles(folder)
    assert.equal(scanned.length, 1); assert.equal(scanned[0].content, 'inside')
    await context.rememberDialogBookmarks(selection(child, 'child-bookmark'), 'file')
    assert.equal(context.findBookmark(child).bookmark, 'child-bookmark', 'exact grant wins over parent directory')
    // Re-selecting the parent must remove an obsolete exact child grant and
    // keep a similarly-prefixed sibling's independent authorization intact.
    await context.rememberDialogBookmarks(selection(path.join(sibling, 'secret.md'), 'sibling-grant'), 'file')
    stale.add('child-bookmark')
    await context.rememberDialogBookmarks(selection(folder, 'fresh-parent-grant'), 'directory')
    assert.equal(await context.readFileWithEncoding(child), 'inside')
    assert.equal(context.findBookmark(child).bookmark, 'fresh-parent-grant')
    assert.equal(context.findBookmark(path.join(sibling, 'secret.md')).bookmark, 'sibling-grant')
    stale.clear()
    const link = path.join(folder, 'escape.md')
    await fs.symlink(path.join(sibling, 'secret.md'), link)
    await assert.rejects(() => context.readFileWithEncoding(link), /重新选择/)
    ensureBalanced()

    // Bulk import reads concurrently with a strict cap and preserves order.
    // Instrument the I/O boundary so this asserts behavior, not timing luck.
    const batchDirectory = path.join(temp, 'batch')
    await fs.mkdir(batchDirectory)
    const batchPaths = Array.from({ length: 25 }, (_, index) => path.join(batchDirectory, `note-${String(index).padStart(2, '0')}.md`))
    await Promise.all(batchPaths.map((file, index) => fs.writeFile(file, `Document ${index}`)))
    await fs.writeFile(path.join(batchDirectory, 'ignored.json'), '{}')
    await context.rememberDialogBookmarks(selection(batchDirectory, 'batch-directory-grant'), 'directory')
    batchPaths.forEach(file => protectedPaths.add(file))
    const originalBatchRead = context.readFile
    let reading = 0, maximumReaders = 0
    context.readFile = async (...args) => {
      if (!batchPaths.includes(args[0])) return originalBatchRead(...args)
      reading++; maximumReaders = Math.max(maximumReaders, reading)
      try { await new Promise(resolve => setTimeout(resolve, 3)); return await originalBatchRead(...args) }
      finally { reading-- }
    }
    const batchFiles = await context.scanMarkdownFiles(batchDirectory)
    assert.ok(maximumReaders > 1 && maximumReaders <= 8, `bounded concurrent reads: ${maximumReaders}`)
    assert.deepEqual(Array.from(batchFiles, file => file.path), batchPaths)
    assert.deepEqual(Array.from(batchFiles, file => file.content), batchPaths.map((_, index) => `Document ${index}`))
    await assert.rejects(() => context.readMarkdownFiles([...batchPaths, path.join(batchDirectory, 'missing.md')]))
    assert.equal(reading, 0, 'a failed batch waits for active reads to release their scopes')
    context.readFile = originalBatchRead
    ensureBalanced()

    // Legacy paths still work where the OS allows them, and permission failure
    // gives a re-import instruction without opening unexpected dialogs.
    const legacy = path.join(temp, 'legacy.md'); await fs.writeFile(legacy, 'legacy')
    assert.equal(await context.readFileWithEncoding(legacy), 'legacy')
    const dialogsBeforeLegacy = dialogs.length
    await assert.rejects(() => context.withFileAccess(legacy, async () => { throw Object.assign(new Error('permission denied'), { code: 'EACCES' }) }), /重新选择/)
    assert.equal(dialogs.length, dialogsBeforeLegacy)

    // Native dialog capture never sends bookmark material to the renderer.
    context.createWindow()
    dialogResult = selection(plain, 'new-file-bookmark')
    sendHandlers.get('renderer-ready')(readerEvent())
    await context.handleImportFile()
    assert.equal(dialogs.at(-1).securityScopedBookmarks, true)
    assert.equal(sent.at(-1)[0], 'files-imported')
    assert.equal(JSON.stringify(sent.at(-1)).includes('new-file-bookmark'), false)
    dialogResult = selection(folder, 'new-directory-bookmark')
    await context.handleImportFolder()
    assert.equal(dialogs.at(-1).securityScopedBookmarks, true)
    assert.equal(context.findBookmark(folder).bookmark, 'new-directory-bookmark')
    await assert.rejects(() => context.rememberDialogBookmarks(selection(legacy, ''), 'file'), /无法保存/)

    // Association events cannot create bookmarks from paths. A native, exact
    // selection is required, and cancel/wrong-file never opens another document.
    dialogResult = { canceled: true, filePaths: [] }
    assert.equal(await context.readAssociatedFile(legacy), undefined)
    dialogResult = selection(plain, 'wrong')
    await assert.rejects(() => context.readAssociatedFile(legacy), /同一文件/)
    dialogResult = selection(legacy, 'legacy-bookmark')
    assert.equal(await context.readAssociatedFile(legacy), 'legacy')
    assert.equal(dialogs.at(-1).defaultPath, legacy)
    stale.add('legacy-bookmark')
    dialogResult = selection(legacy, 'renewed-bookmark')
    assert.equal(await context.readAssociatedFile(legacy), 'legacy')
    assert.equal(context.findBookmark(legacy).bookmark, 'renewed-bookmark')
    stale.clear(); ensureBalanced()

    // Private JSON cannot escape via generic storage IPC, direct path, or alias.
    const privateFile = path.join(userData, 'security-scoped-access', 'bookmarks.json')
    assert.equal(await invoke('get-store', 'bookmarks'), undefined)
    await assert.rejects(() => invoke('read-file', privateFile), /Private application data/)
    await assert.rejects(() => invoke('write-file', privateFile, 'malicious'), /Private application data/)
    const privateLink = path.join(temp, 'bookmark-link.md'); await fs.symlink(privateFile, privateLink)
    await assert.rejects(() => invoke('read-file', privateLink), /Private application data/)
    assert.equal((await fs.stat(privateFile)).mode & 0o777, 0o600)
    const privateBeforeDrop = await fs.readFile(privateFile, 'utf8')
    const cachedPath = await invoke('save-dragged-file', 'a/../../security-scoped-access/bookmarks.json', 'dropped content')
    assert.equal(path.dirname(cachedPath), path.join(userData, 'dragged-files'))
    assert.equal(await fs.readFile(privateFile, 'utf8'), privateBeforeDrop, 'cache bridge cannot overwrite private bookmarks')

    // Parallel updates are merged after initialization and serialized on disk.
    context = createContext(true)
    const nativeWrite = context.writeFile
    let writing = 0, maximumWriters = 0
    context.writeFile = async (...args) => {
      writing++; maximumWriters = Math.max(maximumWriters, writing)
      try { await new Promise(resolve => setTimeout(resolve, 2)); return await nativeWrite(...args) }
      finally { writing-- }
    }
    await Promise.all([
      invoke('set-store', 'one', 1), invoke('set-store', 'two', 2),
      context.rememberDialogBookmarks(selection(plain, 'parallel-a'), 'file'),
      context.rememberDialogBookmarks(selection(legacy, 'parallel-b'), 'file')
    ])
    assert.equal(maximumWriters, 1)
    const genericPath = path.join(userData, 'app-storage.json')
    assert.deepEqual(JSON.parse(await fs.readFile(genericPath, 'utf8')), { one: 1, two: 2 })
    const persisted = JSON.parse(await fs.readFile(privateFile, 'utf8'))
    assert.equal(persisted.find(entry => entry.path === plain).bookmark, 'parallel-a')
    assert.equal(persisted.find(entry => entry.path === legacy).bookmark, 'parallel-b')
    const previous = await fs.readFile(genericPath, 'utf8')
    context.rename = async () => { throw new Error('disk full on replace') }
    await assert.rejects(() => invoke('set-store', 'failed', true), /disk full/)
    assert.equal(await fs.readFile(genericPath, 'utf8'), previous, 'failed atomic replace preserves prior complete JSON')
    context.rename = fs.rename
    await invoke('set-store', 'recovered', true)
    assert.equal(JSON.parse(await fs.readFile(genericPath, 'utf8')).recovered, true, 'queue recovers after write failure')
    ensureBalanced()
    // Malformed generic data is preserved, warned about, and cannot block
    // healthy file grants. Failed reads can be retried in the same process.
    await fs.writeFile(genericPath, '{broken-generic')
    context = createContext(true)
    assert.equal(await context.readFileWithEncoding(plain), 'updated')
    const warningsBefore = errors.length
    await context.loadStorage()
    const genericBackup = (await fs.readdir(userData)).find(name => name.startsWith('app-storage.json.corrupt-'))
    assert.ok(genericBackup)
    assert.equal(await fs.readFile(path.join(userData, genericBackup), 'utf8'), '{broken-generic')
    assert.equal(errors.length, warningsBefore + 1)
    await invoke('set-store', 'afterRecovery', true)
    assert.equal(JSON.parse(await fs.readFile(genericPath, 'utf8')).afterRecovery, true)

    context = createContext(true)
    const nativeRead = context.readFile
    context.readFile = async (filePath, ...args) => {
      if (filePath === genericPath) throw Object.assign(new Error('temporary read failure'), { code: 'EACCES' })
      return nativeRead(filePath, ...args)
    }
    await assert.rejects(() => context.loadStorage(), /temporary read failure/)
    assert.equal(await context.readFileWithEncoding(plain), 'updated', 'generic read error does not block bookmarks')
    context.readFile = nativeRead
    await context.loadStorage()
    assert.equal(await invoke('get-store', 'afterRecovery'), true)

    // Corrupt private grants are quarantined inside the protected directory;
    // failed quarantine keeps source bytes, then succeeds after permissions recover.
    await fs.writeFile(privateFile, '[broken-bookmarks')
    context = createContext(true)
    context.rename = async () => { throw new Error('quarantine temporarily denied') }
    await assert.rejects(() => context.loadBookmarkStorage(), /quarantine temporarily denied/)
    assert.equal(await fs.readFile(privateFile, 'utf8'), '[broken-bookmarks')
    context.rename = fs.rename
    await context.loadBookmarkStorage()
    const bookmarkBackup = (await fs.readdir(path.dirname(privateFile))).find(name => name.startsWith('bookmarks.json.corrupt-'))
    assert.ok(bookmarkBackup)
    const bookmarkBackupPath = path.join(path.dirname(privateFile), bookmarkBackup)
    assert.equal(await fs.readFile(bookmarkBackupPath, 'utf8'), '[broken-bookmarks')
    await assert.rejects(() => invoke('read-file', bookmarkBackupPath), /Private application data/)
    await context.rememberDialogBookmarks(selection(plain, 'after-corrupt-regrant'), 'file')
    assert.equal(await context.readFileWithEncoding(plain), 'updated')

    // UUID + exclusive-create caching cannot overwrite simultaneous same-name drops.
    vm.runInContext('Date.now = () => 123456789', context)
    const [cacheA, cacheB] = await Promise.all([
      invoke('save-dragged-file', 'same.md', 'first copy'),
      invoke('save-dragged-file', 'same.md', 'second copy')
    ])
    assert.notEqual(cacheA, cacheB)
    assert.equal(await fs.readFile(cacheA, 'utf8'), 'first copy')
    assert.equal(await fs.readFile(cacheB, 'utf8'), 'second copy')

    // Exercise the actual preload-to-main bridge. No File.path or renderer
    // clipboard module is present in the fake Electron 44 boundary.
    context.createWindow()
    let bridge
    const preloadListeners = new Map()
    const clipboardEvent = readerEvent
    vm.runInNewContext(await fs.readFile(path.join(__dirname, '../electron/preload.js'), 'utf8'), {
      require: name => {
        assert.equal(name, 'electron')
        return {
          contextBridge: { exposeInMainWorld: (_name, api) => { bridge = api } },
          webUtils: { getPathForFile: file => file.nativePath || '' },
          ipcRenderer: {
            invoke: (channel, ...args) => handlers.get(channel)(clipboardEvent(), ...args),
            on: (channel, callback) => preloadListeners.set(channel, callback),
            send: (channel, ...args) => sendHandlers.get(channel)(clipboardEvent(), ...args),
            removeListener: (channel, callback) => { if (preloadListeners.get(channel) === callback) preloadListeners.delete(channel) }
          }
        }
      },
      console: { log() {}, warn() {}, error() {} }
    })
    const subscriptionEvents = []
    const earlyImport = [{ path: plain, content: 'early' }]
    preloadListeners.get('files-imported')({}, earlyImport)
    const unsubscribeImport = bridge.onFilesImported(files => subscriptionEvents.push(files))
    assert.equal(subscriptionEvents.length, 1, 'pre-subscription event is buffered')
    unsubscribeImport()
    preloadListeners.get('files-imported')({}, [{ path: plain, content: 'during remount' }])
    const unsubscribeAgain = bridge.onFilesImported(files => subscriptionEvents.push(files))
    assert.equal(subscriptionEvents.length, 2, 'StrictMode subscription gaps retain imports')
    assert.equal(subscriptionEvents[1][0].content, 'during remount')
    preloadListeners.get('files-imported')({}, [{ path: plain, content: 'live' }])
    assert.equal(subscriptionEvents.length, 3, 'live events are delivered once')
    unsubscribeAgain()

    const dropped = path.join(temp, 'native-drop.md'); await fs.writeFile(dropped, 'dropped native')
    dialogResult = { canceled: true, filePaths: [] }
    assert.equal((await bridge.importDroppedFile({ nativePath: dropped })).status, 'canceled')
    assert.equal(context.findBookmark(dropped), undefined)
    dialogResult = selection(dropped, 'drop-bookmark')
    protectedPaths.add(dropped)
    const dropResult = await bridge.importDroppedFile({ nativePath: dropped })
    assert.equal(dropResult.status, 'imported')
    assert.equal(dropResult.path, dropped)
    assert.equal(dropResult.content, 'dropped native')
    assert.equal(JSON.stringify(dropResult).includes('drop-bookmark'), false)
    const dialogCountAfterDrop = dialogs.length
    assert.equal((await bridge.importDroppedFile({ nativePath: dropped })).status, 'imported')
    assert.equal(dialogs.length, dialogCountAfterDrop, 'valid persisted grant does not prompt again')
    assert.equal((await bridge.importDroppedFile({})).status, 'unavailable')
    context = createContext(true)
    context.createWindow()
    assert.equal(await context.readFileWithEncoding(dropped), 'dropped native', 'native drop survives restart with its grant')

    // Clipboard IPC awaits Electron 44 promises, propagates failure and rejects
    // other senders/frames. The fake clipboard is never the user's real clipboard.
    let releaseClipboard
    clipboard.writeText = text => new Promise(resolve => { releaseClipboard = () => { clipboardText = text; resolve() } })
    let clipboardFinished = false
    const writingClipboard = bridge.writeClipboard('clipboard sample').then(() => { clipboardFinished = true })
    await Promise.resolve()
    assert.equal(clipboardFinished, false)
    releaseClipboard(); await writingClipboard
    assert.equal(await bridge.readClipboard(), 'clipboard sample')
    clipboard.writeText = async () => { throw new Error('clipboard unavailable') }
    await assert.rejects(() => bridge.writeClipboard('cannot write'), /clipboard unavailable/)
    await assert.rejects(() => handlers.get('clipboard-read-text')({}), /restricted/)
    await assert.rejects(() => handlers.get('clipboard-read-text')({ ...clipboardEvent(), senderFrame: {} }), /restricted/)
    // No IPC capability accepts a child frame, another window, or a main frame
    // navigated away from the exact renderer document. Reject before side effects.
    const trusted = readerEvent()
    for (const handler of handlers.values()) {
      await assert.rejects(() => handler({ ...trusted, senderFrame: { url: trusted.senderFrame.url } }), /restricted/)
      await assert.rejects(() => handler({ ...trusted, sender: {} }), /restricted/)
    }
    const trustedURL = trusted.senderFrame.url
    for (const untrustedURL of ['https://example.com', 'file:///test/out/renderer/other.html', trustedURL + '?untrusted=1', 'about:blank']) {
      trusted.senderFrame.url = untrustedURL
      for (const handler of handlers.values()) await assert.rejects(() => handler(trusted), /restricted/)
      // Event-style calls must be ignored, not throw in the main process.
      for (const handler of sendHandlers.values()) handler(trusted)
    }
    trusted.senderFrame.url = trustedURL + '#reading-position'
    assert.equal(await invoke('get-store', 'afterRecovery'), true, 'same-document fragments remain trusted')
    trusted.senderFrame.url = trustedURL
    for (const handler of sendHandlers.values()) handler({ ...trusted, senderFrame: {} })

    const readerWindow = vm.runInContext('mainWindow', context)
    let prevented = 0
    readerWindow.events.get('will-attach-webview')({ preventDefault: () => { prevented++ } }, {}, {})
    readerWindow.events.get('will-frame-navigate')({ isMainFrame: false, url: 'https://example.com', preventDefault: () => { prevented++ } })
    readerWindow.events.get('will-frame-navigate')({ isMainFrame: false, url: 'file:///test/out/renderer/index.html', preventDefault: () => { prevented++ } })
    assert.equal(prevented, 3, 'webviews and all subframe navigations are denied')
    readerWindow.events.get('will-frame-navigate')({ isMainFrame: true, preventDefault: () => { prevented++ } })
    assert.equal(prevented, 3)
    const linksBefore = links.length
    readerWindow.events.get('will-navigate')({ preventDefault: () => { prevented++ } }, 'https://example.com/document')
    assert.equal(prevented, 4)
    assert.equal(links.at(-1), 'https://example.com/document')
    assert.equal(links.length, linksBefore + 1, 'ordinary links still open externally')
    ensureBalanced()
    console.log('PASS: nonblocking startup, subscription handshake and remount buffering, reopen-on-association, bounded ordered import concurrency; Unicode/empty/missing files, dev/preview startup, external protocols; MAS bookmarks persist/reload, read/write/check/scan scope release, stale/cancel/regrant, directory boundaries and symlinks, private IPC isolation, concurrent/atomic storage; fresh directory regrant, corrupt-store recovery/retry, unique same-time cache, native drop restart, Electron 44 clipboard IPC; all IPC sender/document guards, webview/subframe navigation denial')
  } finally {
    await fs.rm(temp, { recursive: true, force: true })
  }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
