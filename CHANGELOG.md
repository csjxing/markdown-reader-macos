# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased — 2026-09-27

### Performance
- Lazy-load reading and editing modules; minify production renderer JavaScript.
- Memoize Markdown rendering, skip the raw HTML pass for plain Markdown, and replace repeated layout timers with observation.
- Throttle and batch reading metadata persistence before JSON serialization.
- Import a library batch atomically; bound file reads and background file checks to eight concurrent operations.
- Create the main window before storage initialization completes; deliver file associations after a trusted renderer subscription.

### Added
- Local favorites and shared library search, progress filters and ordering.
- Searchable heading outline with active chapter indication.
- Focus reading (`F`, `Esc`) and code block copying.
- Repeatable isolated Electron performance and experience checks.

All new library metadata stays on this device. No account, cloud sync or new server API is introduced.

## 1.0.0 - 2024-03-07

### Added
- Initial release of Markdown Reader
- Minimalist reading experience with distraction-free interface
- Three theme options: Light, Dark, and Sepia
- Customizable display settings (font size, line height, page width)
- Scroll reading with previous/next viewport navigation
- Built-in editor for common Markdown formatting
- Bookshelf management with grid and list views
- Automatic reading progress tracking and restoration
- Table of contents auto-generated from headings
- Full-text search with highlighting (Cmd+F)
- Keyboard shortcuts for efficient navigation
- File association for .md, .markdown, and .txt files
- Drag and drop file import
- Multi-file and folder import support
- Automatic file encoding detection (UTF-8, GBK, UTF-16)
- Cross-platform support (macOS, Windows, Linux)

### Features
- **Bookshelf**
  - Grid and list view modes
  - Recent files quick access
  - Book progress visualization
  - Search and filter functionality

- **Reader**
  - Clean, minimalist interface
  - Three reading themes
  - Adjustable typography
  - Table of contents sidebar
  - Page navigation controls

- **Editor**
  - TiTap-based rich text editor
  - Common Markdown formatting support
  - Tables, task lists, code blocks
  - Explicit file saving with the Save action or Cmd/Ctrl+S

- **Productivity**
  - Keyboard shortcuts
  - File drag and drop
  - Search within documents
  - Progress persistence

### Technical
- React 18 with TypeScript
- Electron 28 for cross-platform desktop app
- Vite for fast development and builds
- Zustand for state management
- Tailwind CSS for styling
- TipTap for rich text editing

---

## Unimplemented roadmap

These ideas are not included in the current application and have no committed release date.

### [1.1.0] - Planned
- Highlight and annotation support
- Export to PDF
- Custom themes
- Bookmarks

### [1.2.0] - Planned
- Multiple library folders
- Advanced search with filters
- Reading statistics

---
