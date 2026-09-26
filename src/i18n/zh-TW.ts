// 繁體中文翻譯
import type { Translations } from './en'

export const zhTW: Translations = {
  // App
  app: {
    name: 'Markdown Reader',
    title: 'Markdown Reader - {{title}}',
  },

  // Navigation
  nav: {
    bookshelf: '書架',
    backToBookshelf: '返回書架',
    close: '關閉',
  },

  // Sidebar
  sidebar: {
    open: '開啟',
    openFile: '開啟檔案',
    openFolder: '開啟資料夾',
    search: '搜尋...',
    sortBy: {
      recent: '最近',
      title: '標題',
      progress: '進度',
    },
    noBooks: '空空如也，匯入文件開始閱讀',
    noResults: '未找到相關內容',
    bookCount: '共 {{count}} 本',
    cached: '快取',
  },

  // Bookshelf
  bookshelf: {
    welcome: '靜心閱讀，沉浸文字',
    importHint: '匯入文件，開啟專注之旅',
    importFile: '匯入檔案',
    importFolder: '匯入資料夾',
    dragHint: '或將檔案拖入此處',
    dropHint: '釋放檔案，開始閱讀',
    continueReading: '繼續閱讀',
    allBooks: '全部書籍',
    gridView: '網格',
    listView: '列表',
    noMatch: '沒有找到符合的書籍',
    chars: '字',
    fileMissing: '檔案失效',
  },

  library: {
    search: '搜尋標題、路徑…',
    favorite: '加入收藏',
    removeFavorite: '取消收藏',
    favorites: '我的收藏',
    allDocuments: '全部文件',
    status: '閱讀狀態',
    allStatus: '全部進度',
    unread: '未讀',
    reading: '閱讀中',
    finished: '已讀完',
    sort: '排序',
    added: '最近匯入',
    clearFilters: '清除篩選',
    resultCount: '{{count}} 篇文件',
  },

  // Reader
  reader: {
    outlineFilter: '篩選目錄標題…',
    focusMode: '專注模式',
    exitFocus: '退出專注模式',
    loadingEditor: '正在載入編輯器…',
    copyCode: '複製程式碼',
    codeCopied: '已複製',
    copyFailed: '複製失敗',
    renderFailed: '無法顯示此文件。',
    retryRender: '重試',
    loadFailed: '無法讀取檔案，檔案可能已移動。請重新匯入或重新整理。',
    refreshFailed: '重新整理失敗，已保留上次載入的內容。',
    cachedCopy: '這是快取副本，請重新匯入原始檔案以讀取最新版本。',
    page: '第 {{current}}/{{total}} 頁',
    fontSize: '{{size}}px',
    toc: '目錄',
    noHeadings: '沒有找到標題',
    noContent: '沒有內容',
    prevPage: '上一頁 (← 或 ↑)',
    nextPage: '下一頁 (→ 或 ↓ 或 Space)',
    loading: '載入中...',
  },

  // Editor
  editor: {
    closeUnsaved: '關閉視窗並放棄尚未儲存的更改？',
    exit: '返回閱讀',
    save: '儲存',
    saving: '儲存中…',
    unsaved: '有尚未儲存的更改',
    linkPrompt: '連結網址',
    imagePrompt: '圖片網址',
    undo: '復原',
    redo: '重做',
    heading: '標題',
    smallerText: '縮小字級',
    largerText: '放大字級',
    bold: '粗體',
    italic: '斜體',
    strike: '刪除線',
    highlight: '螢光標記',
    bulletList: '項目清單',
    orderedList: '編號清單',
    taskList: '工作清單',
    quote: '引言',
    codeBlock: '程式碼區塊',
    rule: '分隔線',
    insertLink: '插入連結',
    insertImage: '插入圖片',
    insertTable: '插入表格',
    saved: '已儲存',
    saveFailed: '儲存失敗，編輯內容仍然保留。請檢查檔案權限後重試。',
    placeholder: '開始寫作...',
    unsavedChanges: '有未儲存的變更，確定離開編輯模式嗎？',
    nestedTableTitle: '無法插入巢狀表格',
    nestedTableMessage: 'Markdown 不支援巢狀表格，請將游標移到目前表格外再插入新表格。',
    pasteTableTitle: '無法在表格內貼上表格',
    pasteTableMessage: 'Markdown 不支援巢狀表格，請將游標移到表格外再貼上。',
  },

  // Settings
  settings: {
    compact: '緊湊',
    relaxed: '寬鬆',
    shortcuts: '鍵盤快捷鍵',
    title: '閱讀設定',
    theme: '主題',
    themes: {
      light: '明亮',
      dark: '深色',
      sepia: '護眼',
    },
    fontSize: '字型',
    lineHeight: '行距',
    pageWidth: '頁面寬度',
    pageWidths: {
      narrow: '窄',
      medium: '中',
      wide: '寬',
      custom: '自訂',
    },
    fontFamily: '字型',
    fontFamilies: {
      sans: '無襯線',
      serif: '襯線',
      mono: '等寬',
    },
    pageMode: '翻頁模式',
    pageModes: {
      scroll: '捲動',
      slide: '滑動',
      flip: '仿真翻頁',
    },
    language: '語言',
    languages: {
      en: 'English',
      'zh-CN': '简体中文',
      'zh-TW': '繁體中文',
    },
  },

  // Actions
  actions: {
    edit: '編輯 (E)',
    refresh: '重新整理 (Cmd+R)',
    settings: '設定',
    toc: '目錄',
    remove: '移除',
    toggleSidebar: '切換側邊欄',
    toggleDarkMode: '切換深色模式',
  },

  // Search
  search: {
    placeholder: '搜尋...',
    noResults: '無結果',
    resultCount: '{{current}} / {{total}}',
  },

  // Progress
  progress: {
    done: '完成',
    percent: '{{percent}}%',
  },

  // Errors
  errors: {
    loadFailed: '**無法載入檔案**\n\n此檔案沒有有效的絕對路徑: `{{path}}`\n\n請使用「開啟檔案」按鈕重新匯入此檔案。',
    fileMoved: '**無法載入檔案**\n\n檔案可能已被移動或刪除: `{{path}}`',
  },

  // Keyboard shortcuts
  shortcuts: {
    prevPage: '上一頁',
    nextPage: '下一頁',
    toggleToc: '切換目錄',
    toggleSettings: '切換設定',
    editMode: '編輯模式',
    back: '返回書架',
    importFile: '匯入檔案',
    search: '搜尋',
    refresh: '重新整理',
    darkMode: '切換深色模式',
  },

  // Menu (Electron)
  menu: {
    file: '檔案',
    edit: '編輯',
    view: '檢視',
    window: '視窗',
    undo: '復原',
    redo: '重做',
    cut: '剪下',
    copy: '複製',
    paste: '貼上',
    selectAll: '全選',
    toggleDarkMode: '切換深色模式',
    toggleFullscreen: '全螢幕',
    minimize: '最小化',
    close: '關閉',
    quit: '結束',
  },
}