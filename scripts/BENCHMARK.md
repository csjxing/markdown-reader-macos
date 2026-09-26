# Electron performance benchmark

`benchmark-electron.cjs` launches the production output supplied by `--main`.
It does not build or modify the application. It needs Playwright's Electron
support and a working native desktop session.

```sh
node scripts/benchmark-electron.cjs --main out/main/index.js --output .validation/optimized.json --label optimized --playwright /absolute/path/to/playwright
node scripts/benchmark-electron.cjs --main ../markdown-reader-baseline-out/main/index.js --output .validation/baseline.json --label baseline --playwright /absolute/path/to/playwright
```

If Playwright is installed in the project, omit `--playwright`. Alternatively,
set `PLAYWRIGHT_MODULE` to its module directory. `--electron` accepts an Electron
executable; by default the project's installed Electron is used. `--runs` defaults
to three. `--editor-smoke` additionally opens and closes the editor without edits.

When preserving an earlier build outside the project, retain the full `main`,
`preload` and `renderer` directories. A `.js` ESM entry needs an enclosing
`package.json` containing `{"type":"module"}` and access to the same external
dependencies (`node_modules`). Never rebuild the baseline before comparing.

Each document size in each trial gets a separate Electron process and newly
created temporary `userData`, `sessionData` and log directory. No existing library,
settings or real documents are read. The script writes deterministic synthetic
Markdown files containing prose, lists, code blocks and tables. Their exact bytes,
section count and SHA-256 are included in the results. Each document is the first
opened document in its process. All successful launches are closed in `finally`;
temporary data are removed afterward.

Measurements:

- Startup: external process launch through a visible bookshelf button, native
  bridge availability and two animation frames. The primary summary uses the
  three 100 KiB trials; the other three launches are preserved per document.
- Import readiness: the main process reads the generated UTF-8 file and sends the
  regular `files-imported` event. Timing ends after the expected first heading
  appears and two animation frames complete. This excludes the native picker
  and app file-authorization flow, and approximates first-screen readiness.
- Scrolling: twenty changes of 80% viewport height with two animation frames per
  step. CDP `TaskDuration` with `threadTicks` records renderer main-thread CPU
  time; the long-task observer separately records tasks longer than 50 ms. CPU
  time is not the duration of the scroll gesture or a frame rate measurement.

Use both samples and medians. These are unpackaged production builds driven by
automation, not App Store cold launches. OS disk caches are not flushed, and CPU
contention or native process creation can dominate startup. If startup differs
unexpectedly, compare alternating versions without loading documents and inspect
navigation, paint and main-process phase timings. Do not infer startup speed from
bundle size alone.
