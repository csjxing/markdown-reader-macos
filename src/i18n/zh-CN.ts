// 简体中文翻译
import type { Translations } from './en'

export const zhCN: Translations = {
  // App
  app: {
    name: 'Markdown Reader',
    title: 'Markdown Reader - {{title}}',
  },

  // Navigation
  nav: {
    bookshelf: '书架',
    backToBookshelf: '返回书架',
    close: '关闭',
  },

  // Sidebar
  sidebar: {
    open: '打开',
    openFile: '打开文件',
    openFolder: '打开文件夹',
    search: '搜索...',
    sortBy: {
      recent: '最近',
      title: '标题',
      progress: '进度',
    },
    noBooks: '空空如也，导入文档开始阅读',
    noResults: '未找到相关内容',
    bookCount: '共 {{count}} 本',
    cached: '缓存',
  },

  // Bookshelf
  bookshelf: {
    welcome: '静心阅读，沉浸文字',
    importHint: '导入文档，开启专注之旅',
    importFile: '导入文件',
    importFolder: '导入文件夹',
    dragHint: '或将文件拖入此处',
    dropHint: '释放文件，开始阅读',
    continueReading: '继续阅读',
    allBooks: '全部书籍',
    gridView: '网格',
    listView: '列表',
    noMatch: '没有找到匹配的书籍',
    chars: '字',
    fileMissing: '文件失效',
  },

  library: {
    search: '搜索标题、路径…',
    favorite: '添加收藏',
    removeFavorite: '取消收藏',
    favorites: '我的收藏',
    allDocuments: '全部文档',
    status: '阅读状态',
    allStatus: '全部进度',
    unread: '未读',
    reading: '阅读中',
    finished: '已读完',
    sort: '排序',
    added: '最近导入',
    clearFilters: '清除筛选',
    resultCount: '{{count}} 篇文档',
  },

  // Reader
  reader: {
    outlineFilter: '筛选目录标题…',
    focusMode: '专注模式',
    exitFocus: '退出专注模式',
    loadingEditor: '正在加载编辑器…',
    copyCode: '复制代码',
    codeCopied: '已复制',
    copyFailed: '复制失败',
    renderFailed: '无法显示此文档。',
    retryRender: '重试',
    loadFailed: '无法读取文件。它可能已移动，请重新导入或点击刷新。',
    refreshFailed: '刷新失败，已保留上次加载的正文。',
    cachedCopy: '这是缓存副本，请重新导入原始文件以读取最新版本。',
    page: '第 {{current}}/{{total}} 页',
    fontSize: '{{size}}px',
    toc: '目录',
    noHeadings: '没有找到标题',
    noContent: '没有内容',
    prevPage: '上一页 (← 或 ↑)',
    nextPage: '下一页 (→ 或 ↓ 或 Space)',
    loading: '加载中...',
  },

  // Editor
  editor: {
    closeUnsaved: '关闭窗口并放弃尚未保存的更改？',
    exit: '返回阅读',
    save: '保存',
    saving: '保存中…',
    unsaved: '有未保存的更改',
    linkPrompt: '链接地址',
    imagePrompt: '图片地址',
    undo: '撤销',
    redo: '重做',
    heading: '标题',
    smallerText: '减小字号',
    largerText: '增大字号',
    bold: '加粗',
    italic: '斜体',
    strike: '删除线',
    highlight: '高亮',
    bulletList: '无序列表',
    orderedList: '有序列表',
    taskList: '任务列表',
    quote: '引用',
    codeBlock: '代码块',
    rule: '分隔线',
    insertLink: '插入链接',
    insertImage: '插入图片',
    insertTable: '插入表格',
    saved: '已保存',
    saveFailed: '保存失败，编辑内容仍然保留。请检查文件权限后重试。',
    placeholder: '开始写作...',
    unsavedChanges: '有未保存的更改，确定离开编辑模式吗？',
    nestedTableTitle: '无法插入嵌套表格',
    nestedTableMessage: 'Markdown 不支持嵌套表格，请将光标移到当前表格外再插入新表格。',
    pasteTableTitle: '无法在表格内粘贴表格',
    pasteTableMessage: 'Markdown 不支持嵌套表格，请将光标移到表格外再粘贴。',
  },

  // Settings
  settings: {
    compact: '紧凑',
    relaxed: '宽松',
    shortcuts: '键盘快捷键',
    title: '阅读设置',
    theme: '主题',
    themes: {
      light: '明亮',
      dark: '深色',
      sepia: '护眼',
    },
    fontSize: '字号',
    lineHeight: '行距',
    pageWidth: '页面宽度',
    pageWidths: {
      narrow: '窄',
      medium: '中',
      wide: '宽',
      custom: '自定义',
    },
    fontFamily: '字体',
    fontFamilies: {
      sans: '无衬线',
      serif: '衬线',
      mono: '等宽',
    },
    pageMode: '翻页模式',
    pageModes: {
      scroll: '滚动',
      slide: '滑动',
      flip: '仿真翻页',
    },
    language: '语言',
    languages: {
      en: 'English',
      'zh-CN': '简体中文',
      'zh-TW': '繁體中文',
    },
  },

  // Actions
  actions: {
    edit: '编辑 (E)',
    refresh: '刷新 (Cmd+R)',
    settings: '设置',
    toc: '目录',
    remove: '移除',
    toggleSidebar: '切换侧边栏',
    toggleDarkMode: '切换深色模式',
  },

  // Search
  search: {
    placeholder: '搜索...',
    noResults: '无结果',
    resultCount: '{{current}} / {{total}}',
  },

  // Progress
  progress: {
    done: '完成',
    percent: '{{percent}}%',
  },

  // Errors
  errors: {
    loadFailed: '**无法加载文件**\n\n此文件没有有效的绝对路径: `{{path}}`\n\n请使用"打开文件"按钮重新导入此文件。',
    fileMoved: '**无法加载文件**\n\n文件可能已被移动或删除: `{{path}}`',
  },

  // Keyboard shortcuts
  shortcuts: {
    prevPage: '上一页',
    nextPage: '下一页',
    toggleToc: '切换目录',
    toggleSettings: '切换设置',
    editMode: '编辑模式',
    back: '返回书架',
    importFile: '导入文件',
    search: '搜索',
    refresh: '刷新',
    darkMode: '切换深色模式',
  },

  // Menu (Electron)
  menu: {
    file: '文件',
    edit: '编辑',
    view: '视图',
    window: '窗口',
    undo: '撤销',
    redo: '重做',
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    selectAll: '全选',
    toggleDarkMode: '切换深色模式',
    toggleFullscreen: '全屏',
    minimize: '最小化',
    close: '关闭',
    quit: '退出',
  },
}