// Launch only synthetic benchmark data in a separate Electron profile.
const { app } = require('electron')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { performance } = require('node:perf_hooks')

if (!process.env.MD_BENCH_USER_DATA || !process.env.MD_BENCH_MAIN) {
  throw new Error('This helper must be launched by benchmark-electron.cjs')
}
app.setPath('userData', process.env.MD_BENCH_USER_DATA)
app.setPath('sessionData', process.env.MD_BENCH_USER_DATA)
app.setAppLogsPath(path.join(process.env.MD_BENCH_USER_DATA, 'logs'))
app.setName('MarkdownReader Performance Check')
globalThis.__benchmarkReadFile = require('node:fs/promises').readFile
const wrapperStarted = performance.now()
globalThis.__benchmarkStartup = { wrapperProcessTimeMs: wrapperStarted }
const mark = name => { globalThis.__benchmarkStartup[name] = +(performance.now() - wrapperStarted).toFixed(2) }
app.once('ready', () => mark('appReadyMs'))
app.once('browser-window-created', (_event, window) => {
  mark('windowCreatedMs')
  window.webContents.once('dom-ready', () => mark('domReadyMs'))
  window.webContents.once('did-finish-load', () => mark('didFinishLoadMs'))
  window.once('ready-to-show', () => mark('readyToShowMs'))
  window.once('show', () => mark('windowShownMs'))
})
import(pathToFileURL(process.env.MD_BENCH_MAIN).href).catch(error => {
  console.error(error)
  app.exit(1)
})
