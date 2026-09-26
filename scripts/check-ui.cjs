// Optional native integration check. Run after npm run build with Playwright
// installed, or point PLAYWRIGHT_MODULE_PATH at an existing Playwright module.
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { _electron: electron } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')

async function run() {
  const project = path.resolve(__dirname, '..')
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-reader-ui-'))
  const helper = path.join(temporary, 'launch.cjs')
  await fs.writeFile(helper, `const {app}=require('electron'); app.setPath('userData',process.env.MD_UI_PROFILE); import(require('node:url').pathToFileURL(process.env.MD_UI_MAIN).href);`)
  const file = path.join(temporary, 'Experience check.md')
  const content = '# Experience check\n\nA searchable reader fixture.\n\n```js\nconst answer = 42\n```\n\n' + Array.from({length:60}, (_,i) => `## Chapter ${i + 1}\n\nReading experience paragraph ${i + 1}.\n\n`).join('')
  await fs.writeFile(file, content)
  const app = await electron.launch({ executablePath: require('electron'), args: [helper],
    env: {...process.env, MD_UI_PROFILE: path.join(temporary,'profile'), MD_UI_MAIN: path.join(project,'out/main/index.js')}, timeout: 30000 })
  const errors = []
  try {
    const page = await app.firstWindow()
    page.on('pageerror', error => errors.push(error.message))
    await page.locator('#root nav').first().waitFor()
    await app.evaluate(({BrowserWindow}, fileData) => BrowserWindow.getAllWindows()[0].webContents.send('files-imported', [fileData]), {path:file,content})
    await page.locator('.markdown-content h1').waitFor()
    assert.equal(await page.locator('.markdown-content h1').textContent(), 'Experience check')
    assert.equal(await page.locator('.reader-code-copy').textContent(), 'Copy code')
    const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(item => item.name))
    assert.equal(resources.some(url => /MarkdownEditor-[^/]+\.js/.test(url)), false, 'editor must not load during reading')
    await page.getByRole('button', {name:'Add to favorites',exact:true}).click()
    await page.getByRole('button', {name:'Remove from favorites',exact:true}).waitFor()
    await page.getByRole('button', {name:'Focus mode',exact:true}).click()
    assert.equal(await page.locator('.reader-toolbar').count(),0)
    await page.keyboard.press('Escape')
    await page.locator('.reader-toolbar').waitFor()
    await page.locator('.reader-toolbar button').last().click()
    const filter = page.getByRole('searchbox', {name:'Filter headings…'})
    await filter.fill('Chapter 42')
    if (process.env.MD_UI_SCREENSHOTS) {
      await fs.mkdir(process.env.MD_UI_SCREENSHOTS,{recursive:true})
      await page.screenshot({path:path.join(process.env.MD_UI_SCREENSHOTS,'reader.png')})
    }
    const heading = page.locator('aside button', {hasText:'Chapter 42'})
    await heading.click()
    await page.waitForFunction(() => {
      const heading=document.querySelector('#user-content-chapter-42')
      return heading && heading.getBoundingClientRect().top < 150
    })
    await page.keyboard.press('Escape')
    // Search controls should not cause Markdown DOM replacement.
    await page.evaluate(() => { window.__firstHeading=document.querySelector('.markdown-content h1') })
    await page.keyboard.press('Meta+f')
    const search = page.locator('input').filter({hasNot:page.locator('aside input')})
    await search.last().fill('searchable')
    await page.locator('mark.search-highlight-current').waitFor()
    assert.equal(await page.evaluate(() => window.__firstHeading === document.querySelector('.markdown-content h1')),true)
    await page.keyboard.press('Escape')
    // Flush a fresh scroll when entering edit mode; lazy editor must then load.
    await page.evaluate(() => { const el=document.querySelector('.markdown-content').parentElement.parentElement; el.scrollTop=900; el.dispatchEvent(new Event('scroll',{bubbles:true})) })
    await page.keyboard.press('e')
    await page.locator('.tiptap').waitFor()
    await page.keyboard.press('Escape')
    await page.locator('.markdown-content').waitFor()
    assert.ok(await page.evaluate(() => document.querySelector('.markdown-content').parentElement.parentElement.scrollTop) > 500, 'edit roundtrip preserves reading position')
    // Reread externally updated document instead of serving stale content.
    await fs.writeFile(file, content.replace('A searchable reader fixture.', 'External refresh is visible.'))
    await page.keyboard.press('Meta+f')
    await page.locator('input').last().fill('paragraph')
    await page.locator('mark.search-highlight-current').waitFor()
    await page.getByRole('button',{name:'Refresh (Cmd+R)',exact:true}).click()
    await page.locator('.markdown-content p', {hasText:'External refresh is visible.'}).waitFor()
    await page.locator('mark.search-highlight-current').waitFor()
    assert.ok(await page.locator('mark').count() > 1, 'refresh reapplies active search to the new DOM')
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')
    await page.locator('#root nav').first().waitFor()
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('markdown-reader-storage')).state.books[0].favorite === true)
    await page.reload()
    await page.locator('#root nav').first().waitFor()
    if (process.env.MD_UI_SCREENSHOTS) {
      await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].setSize(900,700))
      await page.screenshot({path:path.join(process.env.MD_UI_SCREENSHOTS,'library.png')})
    }
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('markdown-reader-storage')).state)
    assert.equal(saved.books[0].favorite,true)
    assert.ok(saved.scrollPositions[saved.books[0].id] > 0)
    assert.deepEqual(errors,[])
    console.log('PASS: native Electron import, deferred editor, local favorite persistence, focus, filtered TOC, search/DOM stability, edit position restore, external refresh and reload')
  } finally { await app.close(); await fs.rm(temporary,{recursive:true,force:true}) }
}
run().catch(error => {console.error(error);process.exitCode=1})
