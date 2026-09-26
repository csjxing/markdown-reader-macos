// English translations
export const en = {
  // App
  app: {
    name: 'Markdown Reader',
    title: 'Markdown Reader - {{title}}',
  },

  // Navigation
  nav: {
    bookshelf: 'Bookshelf',
    backToBookshelf: 'Back to bookshelf',
    close: 'Close',
  },

  // Sidebar
  sidebar: {
    open: 'Open',
    openFile: 'Open File',
    openFolder: 'Open Folder',
    search: 'Search...',
    sortBy: {
      recent: 'Recent',
      title: 'Title',
      progress: 'Progress',
    },
    noBooks: 'Your library is empty. Import to begin.',
    noResults: 'No matches found',
    bookCount: '{{count}} books',
    cached: 'Cached',
  },

  // Bookshelf
  bookshelf: {
    welcome: 'Your Markdown library',
    importHint: 'Open .md, .markdown or .txt files to read and edit them here.',
    importFile: 'Import File',
    importFolder: 'Import Folder',
    dragHint: 'Or drag files here',
    dropHint: 'Release to start reading',
    continueReading: 'Continue Reading',
    allBooks: 'All Books',
    gridView: 'Grid',
    listView: 'List',
    noMatch: 'No matching books found',
    chars: 'chars',
    fileMissing: 'File Missing',
  },

  library: {
    search: 'Search titles and paths…',
    favorite: 'Add to favorites',
    removeFavorite: 'Remove from favorites',
    favorites: 'Favorites',
    allDocuments: 'All documents',
    status: 'Reading status',
    allStatus: 'Any progress',
    unread: 'Unread',
    reading: 'In progress',
    finished: 'Finished',
    sort: 'Sort by',
    added: 'Recently added',
    clearFilters: 'Clear filters',
    resultCount: '{{count}} documents',
  },

  // Reader
  reader: {
    outlineFilter: 'Filter headings…',
    focusMode: 'Focus mode',
    exitFocus: 'Exit focus mode',
    loadingEditor: 'Loading editor…',
    copyCode: 'Copy code',
    codeCopied: 'Copied',
    copyFailed: 'Copy failed',
    renderFailed: 'This document could not be rendered.',
    retryRender: 'Try again',
    loadFailed: 'Could not read this file. It may have moved. Re-import it or try Refresh.',
    refreshFailed: 'Refresh failed. Your last loaded content has been kept.',
    cachedCopy: 'This is a cached copy. Re-import the original file to read its latest version.',
    page: 'Page {{current}}/{{total}}',
    fontSize: '{{size}}px',
    toc: 'Table of Contents',
    noHeadings: 'No headings found',
    noContent: 'No content',
    prevPage: 'Previous page (← or ↑)',
    nextPage: 'Next page (→ or ↓ or Space)',
    loading: 'Loading...',
  },

  // Editor
  editor: {
    closeUnsaved: 'Close this window and discard your unsaved edits?',
    exit: 'Back to reading',
    save: 'Save',
    saving: 'Saving…',
    unsaved: 'Unsaved changes',
    linkPrompt: 'Link URL',
    imagePrompt: 'Image URL',
    undo: 'Undo',
    redo: 'Redo',
    heading: 'Heading',
    smallerText: 'Smaller text',
    largerText: 'Larger text',
    bold: 'Bold',
    italic: 'Italic',
    strike: 'Strikethrough',
    highlight: 'Highlight',
    bulletList: 'Bullet list',
    orderedList: 'Numbered list',
    taskList: 'Task list',
    quote: 'Quote',
    codeBlock: 'Code block',
    rule: 'Divider',
    insertLink: 'Insert link',
    insertImage: 'Insert image',
    insertTable: 'Insert table',
    saved: 'Saved',
    saveFailed: 'Save failed. Your edits are still here. Check the file permissions and try again.',
    placeholder: 'Start writing...',
    unsavedChanges: 'You have unsaved changes. Leave edit mode anyway?',
    nestedTableTitle: 'Cannot Insert Nested Table',
    nestedTableMessage: 'Markdown does not support nested tables. Please move the cursor outside the current table before inserting a new one.',
    pasteTableTitle: 'Cannot Paste Table Inside Table',
    pasteTableMessage: 'Markdown does not support nested tables. Please move the cursor outside the table before pasting.',
  },

  // Settings
  settings: {
    compact: 'Compact',
    relaxed: 'Relaxed',
    shortcuts: 'Keyboard shortcuts',
    title: 'Reading Settings',
    theme: 'Theme',
    themes: {
      light: 'Light',
      dark: 'Dark',
      sepia: 'Sepia',
    },
    fontSize: 'Font Size',
    lineHeight: 'Line Spacing',
    pageWidth: 'Page Width',
    pageWidths: {
      narrow: 'Narrow',
      medium: 'Medium',
      wide: 'Wide',
      custom: 'Custom',
    },
    fontFamily: 'Font Family',
    fontFamilies: {
      sans: 'Sans-serif',
      serif: 'Serif',
      mono: 'Monospace',
    },
    pageMode: 'Page Mode',
    pageModes: {
      scroll: 'Scroll',
      slide: 'Slide',
      flip: 'Page Flip',
    },
    language: 'Language',
    languages: {
      en: 'English',
      'zh-CN': '简体中文',
      'zh-TW': '繁體中文',
    },
  },

  // Actions
  actions: {
    edit: 'Edit (E)',
    refresh: 'Refresh (Cmd+R)',
    settings: 'Settings',
    toc: 'Table of Contents',
    remove: 'Remove',
    toggleSidebar: 'Toggle sidebar',
    toggleDarkMode: 'Toggle dark mode',
  },

  // Search
  search: {
    placeholder: 'Search...',
    noResults: 'No results',
    resultCount: '{{current}} of {{total}}',
  },

  // Progress
  progress: {
    done: 'Done',
    percent: '{{percent}}%',
  },

  // Errors
  errors: {
    loadFailed: '**Failed to load file**\n\nThis file does not have a valid absolute path: `{{path}}`\n\nPlease use "Open File" to re-import this file.',
    fileMoved: '**Failed to load file**\n\nThe file may have been moved or deleted: `{{path}}`',
  },

  // Keyboard shortcuts
  shortcuts: {
    prevPage: 'Previous page',
    nextPage: 'Next page',
    toggleToc: 'Toggle Table of Contents',
    toggleSettings: 'Toggle Settings',
    editMode: 'Edit Mode',
    back: 'Back to bookshelf',
    importFile: 'Import file',
    search: 'Search',
    refresh: 'Refresh',
    darkMode: 'Toggle dark mode',
  },

  // Menu (Electron)
  menu: {
    file: 'File',
    edit: 'Edit',
    view: 'View',
    window: 'Window',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',
    toggleDarkMode: 'Toggle Dark Mode',
    toggleFullscreen: 'Toggle Fullscreen',
    minimize: 'Minimize',
    close: 'Close',
    quit: 'Quit',
  },
} as const

type TranslationStrings<T> = { [K in keyof T]: T[K] extends string ? string : TranslationStrings<T[K]> }
export type Translations = TranslationStrings<typeof en>