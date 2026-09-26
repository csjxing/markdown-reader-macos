#!/usr/bin/env node
/*
 * Reproducible production-build benchmark; no build is performed here.
 * npm install --no-save playwright (or supply --playwright /path/to/playwright)
 * node scripts/benchmark-electron.cjs --main out/main/index.js --output .validation/optimized.json
 * Baseline: use the saved baseline main entry, with its original renderer/preload.
 * Each trial uses fresh temporary userData, generated Markdown, and a new process.
 * This measures automation-observed readiness; it is not a cold disk-cache test.
 */
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const { createHash } = require('node:crypto')
const { performance } = require('node:perf_hooks')

function options(argv) {
  const values = { main: 'out/main/index.js', output: '.validation/benchmark.json', runs: '3', label: 'benchmark' }
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '')
    if (key === 'editor-smoke') values[key] = true
    else if (argv[i].startsWith('--') && argv[i + 1]) values[key] = argv[++i]
    else throw new Error(`Invalid argument: ${argv[i]}`)
  }
  values.main = path.resolve(values.main)
  values.output = path.resolve(values.output)
  values.runs = Number(values.runs)
  if (!Number.isInteger(values.runs) || values.runs < 1 || values.runs > 10) throw new Error('--runs must be 1..10')
  return values
}

function fixture(kib) {
  const title = `Benchmark ${kib} KiB`
  let text = `# ${title}\n\nSynthetic local document for repeatable reader measurement.\n\n`
  let section = 0
  while (Buffer.byteLength(text) < kib * 1024) {
    section++
    text += `## Section ${section}\n\n`
    text += 'Reading performance measures content, navigation and document interaction. **Important facts** remain readable and [local links](#section-1) connect the notes. '.repeat(8) + '\n\n'
    text += '- First item explains the background.\n- Second item records a decision.\n- Third item captures the next step.\n\n'
    text += '```javascript\nconst values = [1, 2, 3];\nconst total = values.reduce((sum, value) => sum + value, 0);\nconsole.log(total);\n```\n\n'
    text += '| Item | State |\n| --- | --- |\n| Reader | Ready |\n| Search | Available |\n\n'
  }
  return { title, text, bytes: Buffer.byteLength(text), sections: section, sha256: createHash('sha256').update(text).digest('hex') }
}

const metricNames = ['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration']
async function metrics(cdp) {
  const { metrics: result } = await cdp.send('Performance.getMetrics')
  return Object.fromEntries(result.map(item => [item.name, item.value]))
}
function delta(before, after) {
  return Object.fromEntries(metricNames.map(name => [`${name.charAt(0).toLowerCase() + name.slice(1)}Ms`, +((after[name] - before[name]) * 1000).toFixed(2)]))
}
async function startLongTasks(page) {
  await page.evaluate(() => {
    window.__benchmarkObserver?.disconnect()
    window.__benchmarkLongTasks = []
    window.__benchmarkObserver = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) window.__benchmarkLongTasks.push({ startTime: entry.startTime, duration: entry.duration })
    })
    window.__benchmarkObserver.observe({ type: 'longtask' })
  })
}
async function longTasks(page) {
  return page.evaluate(() => {
    for (const entry of window.__benchmarkObserver.takeRecords()) window.__benchmarkLongTasks.push({ startTime: entry.startTime, duration: entry.duration })
    const tasks = window.__benchmarkLongTasks
    window.__benchmarkObserver.disconnect()
    return {
      count: tasks.length,
      totalMs: +tasks.reduce((sum, task) => sum + task.duration, 0).toFixed(2),
      maxMs: +Math.max(0, ...tasks.map(task => task.duration)).toFixed(2),
      blockingOver50Ms: +tasks.reduce((sum, task) => sum + Math.max(0, task.duration - 50), 0).toFixed(2)
    }
  })
}
async function frameReady(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}
async function measureDocument(app, page, cdp, doc, filename) {
  await startLongTasks(page)
  const before = await metrics(cdp)
  const start = performance.now()
  // Real local files and the normal renderer import event; bypasses only the OS picker.
  await app.evaluate(async ({ BrowserWindow }, file) => {
    const content = await globalThis.__benchmarkReadFile(file, 'utf8')
    BrowserWindow.getAllWindows()[0].webContents.send('files-imported', [{ path: file, content }])
  }, filename)
  await page.waitForFunction(title => document.querySelector('.markdown-content h1')?.textContent === title, doc.title, { timeout: 120000 })
  const contentVisibleMs = performance.now() - start
  await frameReady(page)
  const readyMs = performance.now() - start
  const importMetrics = delta(before, await metrics(cdp))
  const importLongTasks = await longTasks(page)
  // Let initial effects/animations finish before the independent scroll measurement.
  await page.waitForTimeout(500)
  await startLongTasks(page)
  const scrollBefore = await metrics(cdp)
  const scrollStart = performance.now()
  const scroll = await page.evaluate(async () => {
    let scroller = document.querySelector('.markdown-content')?.parentElement
    while (scroller && !['auto', 'scroll'].includes(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement
    if (!scroller || scroller.scrollHeight <= scroller.clientHeight) throw new Error('Cannot find reader scroll container')
    let events = 0
    const onScroll = () => events++
    scroller.addEventListener('scroll', onScroll)
    const frames = []
    const initialTop = scroller.scrollTop
    for (let step = 1; step <= 20; step++) {
      const start = performance.now()
      scroller.scrollTop = Math.min(scroller.scrollHeight - scroller.clientHeight, step * scroller.clientHeight * 0.8)
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      frames.push(performance.now() - start)
    }
    scroller.removeEventListener('scroll', onScroll)
    return { steps: 20, events, initialTop, finalTop: scroller.scrollTop, documentHeight: scroller.scrollHeight, viewportHeight: scroller.clientHeight, frameWaitMs: frames.map(value => +value.toFixed(2)) }
  })
  await page.waitForTimeout(300)
  return {
    bytes: doc.bytes, sections: doc.sections, sha256: doc.sha256,
    import: { contentVisibleMs: +contentVisibleMs.toFixed(2), readyMs: +readyMs.toFixed(2), ...importMetrics, longTasks: importLongTasks },
    scroll: { ...scroll, wallMs: +(performance.now() - scrollStart).toFixed(2), ...delta(scrollBefore, await metrics(cdp)), longTasks: await longTasks(page) }
  }
}

function summarize(trials) {
  const stats = values => {
    const sorted = [...values].sort((a, b) => a - b)
    return { median: +sorted[Math.floor(sorted.length / 2)].toFixed(2), min: +sorted[0].toFixed(2), max: +sorted.at(-1).toFixed(2), samples: values }
  }
  return {
    startupMs: stats(trials.map(trial => trial.startupMs)),
    documents: Object.fromEntries([100, 500].map(size => [String(size), {
      importReadyMs: stats(trials.map(trial => trial.documents[size].import.readyMs)),
      startupMs: stats(trials.map(trial => trial.documents[size].startupMs)),
      scrollTaskDurationMs: stats(trials.map(trial => trial.documents[size].scroll.taskDurationMs)),
      scrollLongTasks: stats(trials.map(trial => trial.documents[size].scroll.longTasks.count))
    }]))
  }
}

;(async () => {
  const opts = options(process.argv.slice(2))
  const { _electron } = require(opts.playwright || process.env.PLAYWRIGHT_MODULE || 'playwright')
  const executablePath = opts.electron || require('electron')
  await fs.access(opts.main)
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-reader-benchmark-'))
  const docs = Object.fromEntries([100, 500].map(size => [size, fixture(size)]))
  const result = {
    label: opts.label, main: opts.main, measuredAt: new Date().toISOString(),
    environment: { platform: process.platform, arch: process.arch, osRelease: os.release(), cpu: os.cpus()[0]?.model, electronBinary: executablePath },
    methodology: { runs: opts.runs, profile: 'fresh process and temporary userData for each document size in each run (six launches for three runs)', fixtures: 'deterministic ASCII Markdown, prose/lists/code/tables, 100 KiB and 500 KiB minimum', startup: 'process launch through visible enabled bookshelf button and two animation frames; primary startup summary uses the 100 KiB trials', import: 'first document after each fresh launch; main-process local-file read + files-imported IPC through expected first heading and two animation frames; file picker excluded', scroll: '20 synthetic viewport-relative scrollTop changes, two animation frames per step; CDP renderer main-thread task time and >50 ms long tasks', limitations: 'Unpackaged production build under Playwright. OS disk caches not flushed. Automation and CPU contention influence timings. First-screen readiness is an approximation, not field telemetry.' },
    trials: []
  }
  await fs.mkdir(path.dirname(opts.output), { recursive: true })
  try {
    for (const [size, doc] of Object.entries(docs)) await fs.writeFile(path.join(root, `${size}.md`), doc.text)
    for (let run = 1; run <= opts.runs; run++) {
      const trial = { run, documents: {} }
      for (const size of [100, 500]) {
        const userData = path.join(root, `profile-${run}-${size}`)
        await fs.mkdir(userData)
        const env = { ...process.env, MD_BENCH_USER_DATA: userData, MD_BENCH_MAIN: opts.main }
        delete env.ELECTRON_RENDERER_URL
        delete env.ELECTRON_RUN_AS_NODE
        const start = performance.now()
        const app = await _electron.launch({ executablePath, args: [path.join(__dirname, 'benchmark-electron-launch.cjs')], env, timeout: 60000 })
        try {
          const page = await app.firstWindow({ timeout: 60000 })
          await page.locator('#root button').first().waitFor({ state: 'visible', timeout: 120000 })
          await page.waitForFunction(() => !!document.querySelector('#root main button:not(:disabled)') && !!window.electronAPI)
          await frameReady(page)
          const startupMs = +(performance.now() - start).toFixed(2)
          if (size === 100) trial.startupMs = startupMs
          console.log(`Trial ${run}, ${size} KiB: startup ${startupMs} ms`)
          const cdp = await page.context().newCDPSession(page)
          await cdp.send('Performance.enable', { timeDomain: 'threadTicks' })
          trial.documents[size] = { startupMs, ...await measureDocument(app, page, cdp, docs[size], path.join(root, `${size}.md`)) }
          console.log(`Trial ${run}: ${size} KiB import ${trial.documents[size].import.readyMs} ms; scroll main thread ${trial.documents[size].scroll.taskDurationMs} ms`)
          if (opts['editor-smoke'] && size === 100) {
            await page.keyboard.press('e')
            await page.locator('[contenteditable="true"]').first().waitFor({ timeout: 60000 })
            await page.keyboard.press('Escape')
            await page.locator('.markdown-content').waitFor({ timeout: 60000 })
            trial.editorSmoke = 'passed'
          }
          await cdp.detach()
        } finally {
          await app.close()
        }
      }
      result.trials.push(trial)
      await fs.writeFile(opts.output, JSON.stringify(result, null, 2) + '\n')
    }
    result.summary = summarize(result.trials)
    await fs.writeFile(opts.output, JSON.stringify(result, null, 2) + '\n')
    console.log(JSON.stringify({ output: opts.output, summary: result.summary }, null, 2))
  } catch (error) {
    result.error = String(error.stack || error)
    await fs.writeFile(opts.output, JSON.stringify(result, null, 2) + '\n')
    throw error
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})().catch(error => { console.error(error); process.exitCode = 1 })
