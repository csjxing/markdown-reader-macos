// Render the actual component with React's server renderer: no browser, native
// bridge, remote requests, or execution of document scripts is involved.
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

async function run() {
  const dependencies = await Promise.all(['react-markdown', 'remark-gfm', 'rehype-raw', 'rehype-sanitize', 'rehype-slug', 'rehype-highlight'].map(async name => [name, await import(name)]))
  const modules = new Map(dependencies)
  const source = await fs.readFile(path.join(__dirname, '../src/components/reader/MarkdownRenderer.tsx'), 'utf8')
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
  }).outputText
  const exports = {}
  vm.runInNewContext(code, {
    exports,
    require: name => name.endsWith('.css') ? {} : modules.has(name) ? modules.get(name) : require(name),
  })
  const render = content => renderToStaticMarkup(React.createElement(exports.default, { content }))
  const hostile = render(`
<iframe srcdoc="<script>parent.electronAPI.readFile('/etc/passwd')</script>"></iframe>
<iframe src="https://example.com"></iframe>
<object data="https://example.com"><p>object fallback</p></object>
<embed src="https://example.com">
<webview src="https://example.com"></webview>
<form action="https://example.com"><input name="password"><button>submit</button></form>
<script>parent.electronAPI.readFile('/etc/passwd')</script>
<style>body { display: none }</style>
<img src="https://example.com/image.png" onerror="parent.electronAPI.closeWindow()">
<a href="javascript:alert(1)" onclick="alert(2)">unsafe</a>
<a href="data:text/html,hello">data link</a>
<h2 id="location" style="display:none" onmouseenter="alert(3)">Safe heading</h2>
`)
  assert.doesNotMatch(hostile, /<(iframe|object|embed|webview|form|script|style|button)\b/i)
  assert.doesNotMatch(hostile, /srcdoc|parent\.electronAPI|object fallback|display:\s*none|onerror|onclick|onmouseenter|javascript:|data:text\/html/i)
  assert.match(hostile, /id="user-content-location"/)
  assert.doesNotMatch(hostile, /id="location"/)
  assert.match(hostile, /src="https:\/\/example.com\/image.png"/)

  const ordinary = render(`# 中文标题

[中文](#%E4%B8%AD%E6%96%87%E6%A0%87%E9%A2%98)

## Repeated

## Repeated

[second](#repeated-1)

<h2 id="explicit">Raw heading</h2>

[explicit](#explicit)

<h2 id="user-content-custom">Prefixed source ID</h2>

[prefixed](#user-content-custom)

| Name | Value |
| --- | --- |
| Reader | Markdown |

- [x] Completed
- [ ] Pending

\`\`\`js
const value = 42
\`\`\`

[Website](https://example.com/guide)

![Preview](https://example.com/preview.png)

A footnote.[^1]

[^1]: Footnote content.
`)
  assert.match(ordinary, /<table>/)
  assert.match(ordinary, /<input[^>]*type="checkbox"[^>]*disabled=""[^>]*checked=""/)
  assert.match(ordinary, /class="[^\"]*language-js[^\"]*"/)
  assert.match(ordinary, /class="hljs-keyword"/)
  assert.match(ordinary, /<h1 id="user-content-中文标题">/)
  assert.match(ordinary, /<h2 id="user-content-repeated-1">/)
  assert.match(ordinary, /<h2 id="user-content-explicit">/)
  assert.match(ordinary, /id="user-content-user-content-custom"/)
  assert.match(ordinary, /href="https:\/\/example.com\/guide" target="_blank" rel="noopener noreferrer"/)
  assert.match(ordinary, /src="https:\/\/example.com\/preview.png" alt="Preview"/)
  const ids = new Set([...ordinary.matchAll(/\bid="([^\"]+)"/g)].map(match => match[1]))
  const fragments = [...ordinary.matchAll(/href="#([^\"]+)"/g)].map(match => decodeURIComponent(match[1]))
  assert.ok(fragments.length >= 6, 'headings and GFM footnote links are exercised')
  for (const id of fragments) assert.ok(ids.has(id), `fragment points to a final DOM/TOC ID: ${id}`)
  assert.equal(exports.documentAnchor('#%E4%B8%AD%E6%96%87'), 'user-content-中文')
  assert.equal(exports.documentAnchor('#user-content-custom'), 'user-content-user-content-custom')
  assert.doesNotThrow(() => exports.documentAnchor('#bad%fragment'))
  console.log('PASS: actual MarkdownRenderer strips active HTML, event handlers and unsafe protocols; preserves safe links/images, GFM tables/tasks/footnotes, highlighted code, Chinese/repeated/raw IDs and matching fragments')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
