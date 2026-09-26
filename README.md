# Markdown Reader

用于阅读和编辑本地 Markdown 文档的桌面应用。支持书架、目录、搜索和阅读进度。


## 使用方式

从文件或文件夹导入文档，以目录、搜索和阅读进度继续阅读；需要修改时进入编辑模式，手动保存到文件。

## 功能特性

### 沉浸式阅读
- **三种护眼主题** - 亮色、深色、护眼棕，适应不同环境与心境
- **可调排版** - 字号、行距、页面宽度随心定制，找到最舒适的阅读节奏
- **滚动阅读与逐屏导航** - 鼠标滚动阅读，也可通过方向键或导航按钮翻动一屏

### 记录与延续
- **自动进度保存** - 随时离开，随时继续，阅读从不需要重新开始
- **书架管理** - 网格或列表视图，快速找到想读的内容
- **最近阅读** - 醒目展示上次阅读位置，一键续读
- **本地收藏** - 收藏常读文档，在书架和阅读页随时切换
- **书架筛选** - 组合关键词匹配标题/路径，按未读、阅读中、已读完筛选，支持最近、标题、进度、导入时间排序

### 编辑能力
- **内置编辑器** - 想写就写，所见即所得
- **丰富格式支持** - 表格、任务列表、代码高亮
- **手动保存** - 点击保存或按 `Cmd/Ctrl + S` 写入文件；失败时保留编辑内容并提示

### 高效操作
- **目录导航** - 自动提取标题结构，筛选标题、当前章节提示、点击快速跳转
- **专注阅读** - 按 `F` 隐藏阅读工具栏，按 `Esc` 恢复
- **代码复制** - 代码块右上角一键复制，不包含按钮文字
- **全文搜索** - 高亮显示所有匹配结果
- **常用快捷键** - 导入、搜索、目录、设置、保存和逐屏导航

## 安装

### 发行状态

此仓库未配置可验证的公开下载地址。下方命令用于本地开发和构建，不代表已经在任何应用商店发布。

### 从源码构建

```bash
# 在本项目目录执行

# 安装依赖
npm install

# 下载 Electron 二进制文件
node node_modules/electron/install.js

# 开发模式运行
npm run dev

# 构建生产版本
npm run build

# 打包分发
npm run package        # 当前平台
npm run package:mac    # macOS
npm run package:win    # Windows
npm run package:linux  # Linux
```

## 使用指南

### 导入文档

1. 点击侧边栏「打开」按钮
2. 选择「打开文件」或「打开文件夹」
3. 选择 Markdown 文件（.md、.markdown、.txt）

或将文件直接拖入应用窗口。

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `←` / `↑` | 上一页 |
| `→` / `↓` / `Space` | 下一页 |
| `T` | 目录导航 |
| `S` | 设置面板 |
| `E` | 编辑模式 |
| `F` | 切换专注阅读 |
| `Esc` | 返回书架 / 关闭面板 / 退出编辑 |
| `Cmd/Ctrl + S` | 保存当前编辑 |
| `Cmd/Ctrl + O` | 导入文件 |
| `Cmd/Ctrl + F` | 全文搜索 |
| `Cmd/Ctrl + R` | 刷新内容 |
| `Cmd/Ctrl + ,` | 打开设置 |

### 阅读设置

按 `S` 或点击设置图标进入设置：

- **主题** - 亮色 / 深色 / 护眼棕
- **字号** - 14px 至 28px
- **行距** - 紧凑至舒朗
- **页面宽度** - 500px 至 1000px
- **字体** - 无衬线 / 衬线 / 等宽
- **阅读导航** - 连续滚动，也可通过方向键或翻页按钮逐屏移动

## 技术栈

- **[React 18](https://react.dev/)** - UI 框架
- **[Electron 44](https://www.electronjs.org/)** - 桌面应用
- **[Vite](https://vitejs.dev/)** - 构建工具
- **[Zustand](https://zustand-demo.pmnd.rs/)** - 状态管理
- **[Tailwind CSS](https://tailwindcss.com/)** - 样式
- **[TipTap](https://tiptap.dev/)** - 编辑器
- **[react-markdown](https://github.com/remarkjs/react-markdown)** - Markdown 渲染
- **[Framer Motion](https://www.framer.com/motion/)** - 动画

## 项目结构

```
markdown-reader/
├── electron/               # Electron 主进程
│   ├── main.ts            # 主进程入口
│   └── preload.js         # 预加载脚本
├── src/                   # React 应用
│   ├── components/        # UI 组件
│   │   ├── bookshelf/     # 书架组件
│   │   ├── common/        # 通用组件
│   │   ├── editor/        # 编辑器组件
│   │   └── reader/        # 阅读器组件
│   ├── pages/             # 页面
│   ├── store/             # 状态管理
│   └── types/             # TypeScript 类型
├── build/                 # 应用图标
├── out/                   # 构建输出
└── dist/                  # 打包输出
```

## 许可证

package.json 中声明许可证为 MIT。发布源码或分发前需补齐许可证正文与第三方许可清单。

## 当前限制

- 编辑器支持常用 Markdown、表格、任务列表和代码块；保存会重新序列化 Markdown，不承诺任意 HTML 或特殊语法逐字保留。
- 书架保存的是文件引用。移动、删除原文件或撤销文件权限后，需要重新导入。
- 拖入文件若无法获取原始路径，会保存缓存副本；编辑缓存不会同步原始文件。
- 文档中的远程图片会向图片服务发起网络请求。应用本身未集成分析或广告服务。
- macOS 沙盒下的重启后文件访问和最终签名包，需要在分发构建中单独验收。

## Mac App Store 发布构建

当前 Mac 版本使用 Electron 44.4.3，最低 macOS 13。默认发布目标为 MAS arm64，支持 Apple Silicon；可用 `MAS_ARCH=universal` 生成同时支持 Intel 的包。

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer BUILD_NUMBER=2026.9.21 bash scripts/package-mas.sh
```

构建 Universal 包需要额外的临时磁盘空间。脚本先执行类型检查、回归测试和生产构建，再生成签名 `.pkg`。`OUTPUT_DIR` 可指定新输出目录；已有目录会拒绝覆写。需要本机具备与 `build/embedded.provisionprofile` 匹配的应用证书及 Mac Installer 证书。证书更新时同步更新描述文件与 `MAS_SIGNING_IDENTITY` 指纹。

将 `.pkg` 交给 Apple Transporter 上传。上传不等于提交审核；最终沙盒文件授权需在 Apple 重新签名后的 TestFlight 构建中验证。


## 本地性能与体验更新（2026-09-27）

本轮能力均使用本机文件和本地元数据，不需要账号，也没有新增服务端接口。文档中原有远程图片仍按原文地址加载。

- 阅读器、编辑器按需加载，书架启动不加载编辑器；生产脚本压缩。
- 阅读进度与界面状态变化不再重新解析整篇 Markdown；纯 Markdown 跳过额外 HTML 解析。
- 进度更新节流、持久化合并；批量导入一次更新书架。
- 主窗口加载不再等待存储读取；文件关联使用订阅就绪握手，批量文件读取最多 8 路并发。
- 收藏、书架筛选、目录搜索、专注模式和代码复制均可在本地使用。

基准方法、结果与边界见 [PERFORMANCE.md](PERFORMANCE.md)。

```bash
npm run typecheck
npm test
npm run build
# 可选：安装或提供 Playwright；测试全部使用临时文档和独立用户数据。
PLAYWRIGHT_MODULE_PATH=/path/to/playwright node scripts/check-ui.cjs
node scripts/benchmark-electron.cjs --playwright /path/to/playwright --main out/main/index.js --output .validation/optimized.json
```
