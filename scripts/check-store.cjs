const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const crypto = require('node:crypto').webcrypto
function createApp(initialState) {
  const values = new Map()
  if (initialState) values.set('markdown-reader-storage', JSON.stringify({ state: initialState, version: 0 }))
  const api = { readFile: async () => '', writeFile: async () => {} }
  const timers = new Map()
  const listeners = new Map()
  let nextTimer = 0, writes = 0, serializations = 0
  const runtime = {
    crypto, console: { log() {}, error() {}, warn() {} },
    window: { electronAPI: api, addEventListener: (event, handler) => listeners.set(event, handler) },
    document: { visibilityState: 'visible', addEventListener: (event, handler) => listeners.set(event, handler) },
    setTimeout: fn => { const id = ++nextTimer; timers.set(id, fn); return id },
    clearTimeout: id => timers.delete(id),
    JSON: { parse: JSON.parse, stringify: value => { serializations++; return JSON.stringify(value) } },
    localStorage: { getItem: k => values.get(k) ?? null, setItem: (k, v) => { writes++; values.set(k, v) }, removeItem: k => values.delete(k) },
  }
  const modules = new Map()
  const load = filename => {
    if (modules.has(filename)) return modules.get(filename)
    const output = { exports: {} }
    const context = vm.createContext({ ...runtime, module: output, exports: output.exports,
      require: name => name.startsWith('.') ? load(path.resolve(path.dirname(filename), name + '.ts')) : require(name) })
    vm.runInContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS }
    }).outputText, context)
    modules.set(filename, output.exports)
    return output.exports
  }
  const exports = load(path.join(__dirname, '../src/store/index.ts'))
  return { ...exports, api, values, timers, listeners, runtime, stats: () => ({ writes, serializations }) }
}
const app = createApp()
const store = app.useStore
const api = app.api
const book = p => ({ title: 'README', path: p, progress: 0, lastRead: new Date().toISOString(), wordCount: 0 })
const defer = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { resolve, reject, promise } }
async function run() {
  const a = store.getState().addBook(book('/alpha/README.md'))
  const b = store.getState().addBook(book('/beta/README.md'))
  assert.notEqual(a.id, b.id)
  store.getState().updateProgress(a.id, 42)
  const again = store.getState().addBook(book(a.path))
  assert.equal(again.id, a.id)
  assert.equal(again.progress, 42)
  assert.equal(store.getState().books.length, 2)
  let reads = 0
  const first = defer(), second = defer()
  api.readFile = p => { reads++; return p === a.path ? first.promise : second.promise }
  store.getState().setCurrentBook(a)
  const pendingA = store.getState().loadBookContent(a)
  store.getState().setCurrentBook(b)
  assert.equal(store.getState().currentContent, '')
  const pendingB = store.getState().loadBookContent(b)
  second.resolve('B content'); await pendingB
  first.resolve('stale A'); await pendingA
  assert.equal(store.getState().currentContent, 'B content')
  assert.equal(store.getState().loadedBookId, b.id)
  store.getState().setCurrentBook(a)
  api.readFile = async () => { reads++; return '' }
  await store.getState().loadBookContent(a)
  const afterEmpty = reads
  await store.getState().loadBookContent(a)
  assert.equal(reads, afterEmpty)
  assert.equal(store.getState().currentContent, '')
  store.getState().setCurrentBook(b)
  api.readFile = async () => { throw new Error('missing') }
  await store.getState().loadBookContent(b)
  assert.equal(store.getState().contentNotice, 'loadFailed')
  assert.equal(store.getState().currentContent, '')
  store.getState().setEditMode(true)
  assert.equal(store.getState().isEditMode, false)
  store.getState().openBookWithContent(a, 'original')
  store.getState().setEditMode(true)
  store.getState().setEditedContent('draft')
  api.writeFile = async () => { throw new Error('disk full') }
  await assert.rejects(store.getState().saveContent)
  assert.equal(store.getState().currentContent, 'original')
  assert.equal(store.getState().hasUnsavedChanges, true)
  assert.equal(store.getState().isSaving, false)
  const writing = defer()
  api.writeFile = () => writing.promise
  const pendingWrite = store.getState().saveContent()
  store.getState().setEditedContent('newer draft')
  writing.resolve(); await pendingWrite
  assert.equal(store.getState().currentContent, 'draft')
  assert.equal(store.getState().hasUnsavedChanges, true)
  api.writeFile = async () => {}
  await store.getState().saveContent()
  assert.equal(store.getState().currentContent, 'newer draft')
  assert.equal(store.getState().hasUnsavedChanges, false)
  store.getState().setEditMode(false)
  await store.getState().refreshCurrentContent()
  assert.equal(store.getState().contentNotice, 'refreshFailed')
  assert.equal(store.getState().currentContent, 'newer draft')
  // Favorites survive re-import and batch import, and immediately update the active reader.
  store.getState().toggleFavorite(a.id)
  assert.equal(store.getState().currentBook.favorite, true)
  const imported = store.getState().addBooks([book(a.path), book('/gamma/notes.md'), book('/gamma/notes.md')])
  assert.equal(imported[0].favorite, true)
  assert.equal(imported[1].id, imported[2].id)
  assert.equal(store.getState().books.length, 3)
  let notifications = 0
  const unsubscribe = store.subscribe(() => notifications++)
  store.getState().addBooks(Array.from({ length: 1000 }, (_, i) => book(`/batch/${i}.md`)))
  assert.equal(notifications, 1, 'bulk import must commit once, not once per document')
  unsubscribe()
  // One atomic scroll update, deduped and clamped, cannot recreate removed documents.
  let updates = 0
  const stop = store.subscribe(() => updates++)
  store.getState().updateReadingPosition(a.id, 120, 42)
  assert.equal(updates, 1)
  store.getState().updateReadingPosition(a.id, 120, 42)
  assert.equal(updates, 1)
  store.getState().updateReadingPosition(a.id, -8, 300)
  assert.equal(store.getState().scrollPositions[a.id], 0)
  assert.equal(store.getState().currentBook.progress, 100)
  stop()
  app.flushStorePersistence()
  const previous = app.stats()
  for (let i = 0; i < 100; i++) {
    store.getState().setSearchQuery(String(i))
    store.getState().setTableOfContents([{ id: String(i), title: 'Heading', level: 1, position: i }])
    store.getState().setEditedContent(`draft ${i}`)
  }
  assert.equal(app.stats().serializations, previous.serializations, 'transient UI state must not serialize the library')
  for (let i = 1; i <= 100; i++) store.getState().updateReadingPosition(a.id, i, 55)
  assert.equal(app.stats().serializations, previous.serializations, 'scrolling must defer JSON serialization')
  assert.equal(app.timers.size, 1, 'continuous scroll shares one bounded write deadline')
  ;[...app.timers.values()][0]()
  assert.equal(app.stats().writes, previous.writes + 1)
  assert.equal(app.stats().serializations, previous.serializations + 1)
  let saved = JSON.parse(app.values.get('markdown-reader-storage')).state
  assert.equal(saved.scrollPositions[a.id], 100)
  assert.equal(saved.books.find(item => item.id === a.id).favorite, true)
  assert.equal(saved.currentContent, undefined)
  assert.equal(saved.editedContent, undefined)
  const reopened = createApp(saved).useStore.getState()
  assert.equal(reopened.books.find(item => item.id === a.id).favorite, true, 'favorites survive app restart')
  assert.equal(reopened.scrollPositions[a.id], 100)
  store.getState().updateReadingPosition(a.id, 200, 60)
  app.listeners.get('pagehide')()
  saved = JSON.parse(app.values.get('markdown-reader-storage')).state
  assert.equal(saved.scrollPositions[a.id], 200, 'closing flushes the latest buffered progress')

  const filters = { query: '', favoriteOnly: false, status: 'all' }
  const samples = [
    { ...book('/work/project.md'), id: 'p', title: 'Project plan', favorite: true, progress: 20, addedAt: '2025-01-01' },
    { ...book('/home/project.md'), id: 'h', title: 'Project done', favorite: true, progress: 100, addedAt: '2025-02-01' },
    { ...book('/work/draft.md'), id: 'd', title: 'Draft', progress: 0, addedAt: '2025-03-01' },
  ]
  const select = (extra, sort = 'title') => [...app.filterLibraryBooks(samples, { ...filters, ...extra }, sort)].map(item => item.id)
  assert.deepEqual(select({ query: ' PROJECT  work ', favoriteOnly: true, status: 'reading' }), ['p'])
  assert.deepEqual(select({ status: 'unread' }), ['d'])
  assert.deepEqual(select({ status: 'finished' }), ['h'])
  assert.deepEqual(select({}, 'added'), ['d', 'h', 'p'])
  assert.deepEqual(select({}, 'progress'), ['h', 'p', 'd'])
  assert.equal(samples[0].id, 'p', 'sorting does not mutate the source library')
  store.getState().setLibraryFilters({ query: 'library' })
  store.getState().setSearchQuery('reader')
  assert.equal(store.getState().libraryFilters.query, 'library', 'reader search is independent from library search')
  store.getState().removeBook(a.id)
  assert.equal(store.getState().currentBook, null)
  assert.equal(store.getState().loadedBookId, null)
  assert.equal(store.getState().scrollPositions[a.id], undefined)
  store.getState().updateReadingPosition(a.id, 999, 99)
  assert.equal(store.getState().scrollPositions[a.id], undefined)

  // Old data has no favorites or sort key, may contain stale body caches and orphan positions.
  const oldApp = createApp({ books: [{ ...book('/legacy.md'), id: 'legacy', content: 'large old body', cachedContent: 'old cache' }, null, { id: 'bad', path: 'relative.md' }],
    settings: { theme: 'dark' }, scrollPositions: { legacy: 55, removed: 99 }, viewMode: 'list' })
  const restored = oldApp.useStore.getState()
  assert.equal(restored.books.length, 1)
  assert.equal(restored.books[0].favorite, false)
  assert.equal(restored.books[0].content, undefined)
  assert.equal(restored.books[0].cachedContent, undefined)
  assert.equal(restored.settings.theme, 'dark')
  assert.equal(restored.settings.fontSize, 18)
  assert.equal(restored.librarySort, 'recent')
  assert.equal(restored.scrollPositions.legacy, 55)
  assert.equal(restored.scrollPositions.removed, undefined)
  console.log('PASS: loading/saving safety, 1000-file atomic import, local favorites, combined filters, legacy migration, removed metadata cleanup; 100 scroll updates produce 1 JSON serialization/write, 300 transient updates produce 0')
}
run().catch(e => { console.error(e); process.exitCode = 1 })
