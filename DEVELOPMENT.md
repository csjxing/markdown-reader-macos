# Markdown Reader 开发手册

> 本手册记录了项目的开发规范、架构设计和已知问题，供所有开发者参考和遵守。

## 目录

- [项目架构](#项目架构)
- [技术栈](#技术栈)
- [代码规范](#代码规范)
- [命名约定](#命名约定)
- [文件结构](#文件结构)
- [国际化规范](#国际化规范)
- [已知问题与陷阱](#已知问题与陷阱)
- [组件开发指南](#组件开发指南)
- [状态管理](#状态管理)
- [发布流程](#发布流程)
- [更新日志](#更新日志)

---

## 项目架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Electron 主进程                         │
│  (electron/main.ts - 文件系统、窗口管理、菜单)                │
├─────────────────────────────────────────────────────────────┤
│                      预加载脚本                              │
│  (electron/preload.js - 安全的 IPC 桥接)                    │
├─────────────────────────────────────────────────────────────┤
│                      React 渲染进程                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Bookshelf │  │    Reader   │  │    Editor   │        │
│  │   (书架)    │  │   (阅读器)  │  │   (编辑器)  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                    Zustand Store                            │
│                   (全局状态管理)                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 技术栈

| 领域 | 技术 | 版本 |
|------|------|------|
| 语言 | TypeScript | 5.3+ (strict mode) |
| UI 框架 | React | 18.2+ |
| 状态管理 | Zustand | 4.5+ |
| 样式 | Tailwind CSS | 3.4+ |
| 构建工具 | Vite (electron-vite) | 5.x |
| 桌面端 | Electron | 44.4.3 |
| 编辑器 | Tiptap | 3.x |
| Markdown 渲染 | react-markdown + remark-gfm | 9.x |
| 动画 | Framer Motion | 11.x |
| 国际化 | 自定义 i18n | - |

---

## 代码规范

### TypeScript 配置

- **严格模式**: 启用 `strict: true`
- **未使用变量检查**: 启用 `noUnusedLocals`, `noUnusedParameters`
- **目标版本**: ES2020
- **模块解析**: bundler 模式

### ESLint 规则

```javascript
{
  // React
  'react/react-in-jsx-scope': 'off',  // React 17+ 不需要导入 React
  'react/prop-types': 'off',           // 使用 TypeScript 类型

  // TypeScript
  '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  '@typescript-eslint/no-explicit-any': 'warn',

  // General
  'no-console': ['warn', { allow: ['warn', 'error'] }],
  'prefer-const': 'warn',
  'no-var': 'error',
}
```

### Prettier 配置

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100
}
```

### 编辑器配置

- 字符编码: UTF-8
- 缩进: 2 空格
- 换行符: LF
- 自动添加末尾空行

---

## 命名约定

### 文件命名

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| 组件 | PascalCase.tsx | `BookCard.tsx`, `EditorToolbar.tsx` |
| Hook | use[Name].ts | `useBooks.ts`, `useTranslation.ts` |
| 工具函数 | camelCase.ts | `markdown.ts`, `fileUtils.ts` |
| 类型定义 | PascalCase (在 types/) | `index.ts` 导出 |
| 扩展 | PascalCase.ts | `SearchExtension.ts` |

### 变量命名

| 类型 | 前缀/规则 | 示例 |
|------|---------|------|
| 布尔变量 | is/has/can 前缀 | `isLoading`, `hasUnsavedChanges` |
| 事件处理 | handle 前缀 | `handleSave`, `handleClick` |
| 回调函数 | on 前缀 (props) | `onSave`, `onClose` |
| Ref | Ref 后缀 | `editorRef`, `menuRef` |
| 常量 | UPPER_SNAKE_CASE | `DEFAULT_SETTINGS` |

### 组件命名

```tsx
// ✅ 推荐：函数组件 + 明确的类型定义
interface BookCardProps {
  book: Book
  onSelect: (book: Book) => void
}

export default function BookCard({ book, onSelect }: BookCardProps) {
  // ...
}

// ❌ 避免：匿名导出
export default ({ book }: { book: Book }) => { ... }
```

---

## 文件结构

```
markdown-reader/
├── electron/                    # Electron 主进程
│   ├── main.ts                 # 主进程入口（窗口、菜单、IPC）
│   └── preload.js              # 预加载脚本（安全桥接）
│
├── src/                         # React 应用
│   ├── components/             # UI 组件
│   │   ├── bookshelf/          # 书架相关组件
│   │   ├── common/             # 通用组件（按钮、弹窗等）
│   │   ├── editor/             # 编辑器组件
│   │   │   ├── MarkdownEditor.tsx
│   │   │   ├── EditorToolbar.tsx
│   │   │   ├── TableBubbleMenu.tsx
│   │   │   └── extensions/     # Tiptap 扩展
│   │   └── reader/             # 阅读器组件
│   │
│   ├── hooks/                  # 自定义 Hooks
│   │   ├── useBooks.ts
│   │   ├── useProgress.ts
│   │   ├── useSettings.ts
│   │   └── useTranslation.ts
│   │
│   ├── i18n/                   # 国际化
│   │   ├── index.ts            # i18n 配置和工具函数
│   │   ├── en.ts               # 英语（基础语言）
│   │   ├── zh-CN.ts            # 简体中文
│   │   └── zh-TW.ts            # 繁体中文
│   │
│   ├── pages/                  # 页面组件
│   │   ├── Bookshelf.tsx
│   │   └── Reader.tsx
│   │
│   ├── store/                  # Zustand 状态管理
│   │   └── index.ts
│   │
│   ├── styles/                 # 全局样式
│   │   └── global.css
│   │
│   ├── types/                  # TypeScript 类型定义
│   │   └── index.ts
│   │
│   ├── utils/                  # 工具函数
│   │   └── markdown.ts
│   │
│   ├── App.tsx                 # 应用根组件
│   └── main.tsx                # 应用入口
│
├── build/                       # 构建资源
│   ├── icon.icns               # macOS 图标
│   ├── icon.ico                # Windows 图标
│   └── icon.png                # Linux 图标
│
├── out/                         # 构建输出（gitignore）
├── dist/                        # 打包输出（gitignore）
│
├── .editorconfig               # 编辑器配置
├── .eslintrc.cjs               # ESLint 配置
├── .prettierrc                 # Prettier 配置
├── .gitignore                  # Git 忽略规则
├── package.json                # 项目配置
├── tsconfig.json               # TypeScript 配置
└── DEVELOPMENT.md              # 本开发手册
```

---

## 国际化规范

### 支持的语言

| 代码 | 语言 | 文件 |
|------|------|------|
| `en` | English | `src/i18n/en.ts` |
| `zh-CN` | 简体中文 | `src/i18n/zh-CN.ts` |
| `zh-TW` | 繁體中文 | `src/i18n/zh-TW.ts` |

### 添加新语言

1. 复制 `src/i18n/en.ts` 为新语言文件
2. 翻译所有文本
3. 在 `src/i18n/index.ts` 中导入并注册

### 使用翻译

```tsx
import { t } from '../../i18n'
import { useStore } from '../../store'

function MyComponent() {
  const { settings } = useStore()
  const locale = settings.locale

  // 使用翻译
  const title = t(locale, 'sidebar.openFile')

  // 带参数的翻译
  const count = t(locale, 'sidebar.bookCount', { count: 10 })

  return <button>{title}</button>
}
```

### 添加新翻译键

1. **首先在 `en.ts` 中添加英文版本**（这是基础语言和类型定义）
2. 然后在 `zh-CN.ts` 和 `zh-TW.ts` 中添加对应翻译
3. 保持所有语言文件的键结构一致

```typescript
// en.ts
export const en = {
  // ...
  editor: {
    nestedTableTitle: 'Cannot Insert Nested Table',
    nestedTableMessage: 'Markdown does not support...',
  },
} as const

// zh-CN.ts
export const zhCN: Translations = {
  // ...
  editor: {
    nestedTableTitle: '无法插入嵌套表格',
    nestedTableMessage: 'Markdown 不支持...',
  },
}
```

### ⚠️ 禁止硬编码文本

```tsx
// ❌ 错误：硬编码文本
<button>打开文件</button>

// ✅ 正确：使用国际化
<button>{t(locale, 'sidebar.openFile')}</button>
```

---

## 已知问题与陷阱

### 🔴 表格嵌套问题

**问题描述**：Markdown 标准（包括 GFM）不支持表格嵌套表格。Tiptap 编辑器也不支持此功能。

**影响**：
- 在表格内插入表格会导致格式错乱
- 内容可能丢失或无法正确保存

**解决方案**：
- 已在工具栏插入表格时添加检测，阻止嵌套操作
- 已在粘贴时添加检测，阻止粘贴表格到表格内
- 显示用户友好的提示信息

**相关代码**：
- `src/components/editor/EditorToolbar.tsx` - `addTable()` 函数
- `src/components/editor/MarkdownEditor.tsx` - `handlePaste` 配置

**注意**：如果未来需要支持 HTML 嵌套表格，需要：
1. 自定义 Tiptap 表格扩展
2. 修改 Markdown 转换逻辑
3. 考虑与标准 Markdown 的兼容性

---

### 🟡 表格格式保留问题

**问题描述**：原始文档中的表格可能是 Markdown 格式或 HTML 格式。编辑后需要保持原有格式。

**解决方案**：
1. 进入编辑模式时检测所有表格格式（`detectTableFormats`）
2. 存储格式信息到 store（`tableFormats`）
3. 保存时根据原始格式转换回来（`restoreTableFormats`）

**相关代码**：
- `src/utils/markdown.ts` - `detectTableFormats`, `restoreTableFormats` 函数
- `src/store/index.ts` - `TableFormatInfo` 类型, `tableFormats` 状态
- `src/components/editor/MarkdownEditor.tsx` - 格式检测和恢复逻辑

**注意事项**：
- 格式匹配基于表格顺序，如果用户大幅修改表格数量可能有偏差
- HTML 表格的复杂属性（如 colspan, rowspan）可能无法完美保留

---

### 🟡 Tiptap Markdown 扩展的 Ref 问题

**问题描述**：`useEditor` 的回调函数在创建时捕获变量，导致闭包问题。

**解决方案**：使用 `useRef` 保持状态同步。

```tsx
// ❌ 错误：tableFormats 在闭包中永远是初始值
onUpdate: ({ editor }) => {
  if (tableFormats.length > 0) { ... }
}

// ✅ 正确：使用 ref 保持同步
const tableFormatsRef = useRef<TableFormatInfo[]>([])

useEffect(() => {
  tableFormatsRef.current = tableFormats
}, [tableFormats])

onUpdate: ({ editor }) => {
  if (tableFormatsRef.current.length > 0) { ... }
}
```

---

### 🟢 文件路径处理

**问题描述**：拖拽导入的文件没有绝对路径，无法持久化。

**解决方案**：
- 拖拽文件标记为 `isCached: true`
- 启动时过滤掉无效的相对路径书籍
- 提示用户重新导入

**相关代码**：
- `src/store/index.ts` - `merge` 函数过滤无效路径

---

### 🟢 代码签名问题

**问题描述**：没有 Apple Developer 证书时无法进行 macOS 代码签名。

**当前状态**：跳过签名，用户首次打开需在系统设置中允许。

**打包命令**：
```bash
# 仅构建 DMG（跳过 MAS）
npx electron-builder --mac dmg --x64 --arm64
```

---

## 组件开发指南

### 新增组件步骤

1. 在对应目录创建组件文件
2. 定义 Props 接口
3. 实现组件逻辑
4. 添加必要的翻译
5. 导出组件

### 组件模板

```tsx
import { useState } from 'react'
import { useStore } from '../../store'
import { t } from '../../i18n'

interface MyComponentProps {
  title: string
  onAction: () => void
}

export default function MyComponent({ title, onAction }: MyComponentProps) {
  const { settings } = useStore()
  const [isActive, setIsActive] = useState(false)

  return (
    <div className="...">
      {/* 组件内容 */}
    </div>
  )
}
```

### 样式规范

- 优先使用 Tailwind CSS 类名
- 复杂样式放在 `src/styles/global.css`
- 主题相关样式使用 CSS 变量或 Tailwind 的 dark: 前缀
- 编辑器表格使用 `.editor-table` 类名

---

## 状态管理

### Store 结构

```typescript
interface AppState {
  // 书籍管理
  books: Book[]
  currentBook: Book | null
  currentContent: string

  // 设置
  settings: ReaderSettings

  // UI 状态
  isSidebarOpen: boolean
  isEditMode: boolean

  // 编辑模式
  editedContent: string
  hasUnsavedChanges: boolean
  tableFormats: TableFormatInfo[]

  // 搜索
  searchQuery: string
  isSearchOpen: boolean

  // 滚动位置
  scrollPositions: Record<string, number>
}
```

### 添加新状态

1. 在 `src/store/index.ts` 的 `AppState` 接口中添加类型
2. 在 store 创建函数中添加默认值
3. 添加相关的 action 函数

### 持久化

- 使用 `zustand/middleware` 的 `persist`
- 只持久化必要的数据（`partialize`）
- 不持久化 `currentBook` 和 `currentContent`（内存中）

---

## 发布流程

### 版本号规范

遵循语义化版本：`MAJOR.MINOR.PATCH`

- **MAJOR**: 不兼容的 API 修改
- **MINOR**: 向下兼容的功能新增
- **PATCH**: 向下兼容的问题修复

### 发布步骤

1. 更新 `package.json` 版本号
2. 更新 `CHANGELOG.md`
3. 构建测试
   ```bash
   npm run build
   npm run dev  # 手动测试
   ```
4. 打包
   ```bash
   npm run package:mac
   npm run package:win
   npm run package:linux
   ```
5. 创建 Git 标签
   ```bash
   git tag v2.0.1
   git push origin v2.0.1
   ```
6. 创建 GitHub Release，上传安装包

---

## 更新日志

### 2025-03-15

- 新增：表格格式保留功能（Markdown/HTML 格式自动识别和恢复）
- 新增：禁止嵌套表格功能（工具栏插入 + 粘贴检测）
- 新增：国际化支持表格嵌套提示
- 新增：开发手册文档

### 待办事项

- [ ] 添加单元测试
- [ ] 添加 E2E 测试
- [ ] 优化大文件加载性能
- [ ] 支持更多 Markdown 扩展语法

---

> 最后更新：2025-03-15
>
> 如发现问题或有改进建议，请更新本文档。