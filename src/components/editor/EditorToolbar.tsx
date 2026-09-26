import { Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Undo,
  Redo,
  Link,
  Image,
  Table,
  Minus,
  Code2,
  Save,
  Highlighter,
  ArrowLeft,
  MinusCircle,
  PlusCircle,
} from 'lucide-react'
import { useStore } from '../../store'
import { t } from '../../i18n'

interface EditorToolbarProps {
  editor: Editor
  onSave: () => void
  onExit: () => void
  hasUnsavedChanges: boolean
  isSaving?: boolean
  bookTitle: string
  theme: 'light' | 'dark' | 'sepia'
}

export default function EditorToolbar({
  editor,
  onSave,
  onExit,
  hasUnsavedChanges,
  isSaving = false,
  bookTitle,
  theme,
}: EditorToolbarProps) {
  const { settings, updateSettings } = useStore()
  const label = (key: string) => t(settings.locale, `editor.${key}`)
  const command = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform) ? '⌘' : 'Ctrl+'

  const addLink = () => {
    const url = window.prompt(label('linkPrompt'))
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  const addImage = () => {
    const url = window.prompt(label('imagePrompt'))
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  const addTable = () => {
    // 检查当前是否在表格内，禁止嵌套表格
    if (editor.isActive('table')) {
      const locale = settings.locale
      alert(t(locale, 'editor.nestedTableTitle') + '\n\n' + t(locale, 'editor.nestedTableMessage'))
      return
    }
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  const themeStyles = {
    light: {
      bg: 'bg-white border-gray-200',
      text: 'text-gray-700',
      button: 'text-gray-600 hover:bg-gray-100',
      buttonActive: 'bg-gray-200 text-gray-900',
      divider: 'bg-gray-200',
    },
    dark: {
      bg: 'bg-gray-800 border-gray-700',
      text: 'text-gray-200',
      button: 'text-gray-400 hover:bg-gray-700',
      buttonActive: 'bg-gray-600 text-white',
      divider: 'bg-gray-700',
    },
    sepia: {
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-900',
      button: 'text-amber-700 hover:bg-amber-100',
      buttonActive: 'bg-amber-200 text-amber-900',
      divider: 'bg-amber-200',
    },
  }

  const styles = themeStyles[theme]

  const ToolbarButton = ({
    onClick,
    isActive = false,
    disabled = false,
    title,
    children,
  }: {
    onClick: () => void
    isActive?: boolean
    disabled?: boolean
    title: string
    children: React.ReactNode
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`p-2 rounded transition-colors ${
        isActive ? styles.buttonActive : styles.button
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  )

  const Divider = () => <div className={`w-px h-5 ${styles.divider} mx-1`} />

  return (
    <div title={bookTitle} className={`flex items-center justify-between gap-3 px-4 py-2 border-b overflow-x-auto ${styles.bg}`}>
      {/* Left section - Exit button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onExit}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-all ${
            theme === 'dark'
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
          title={`${label('exit')} (Esc)`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="text-xs whitespace-nowrap">{label('exit')}</span>
        </button>
        {hasUnsavedChanges && (
          <span role="status" className="text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap">{label(isSaving ? 'saving' : 'unsaved')}</span>
        )}
      </div>

      {/* Right section - Formatting tools */}
      <div className={`flex items-center gap-1 ${styles.text}`}>
        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title={`${label('undo')} (${command}Z)`}
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title={`${label('redo')} (${command}Shift+Z)`}
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title={`${label('heading')} 1`}
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title={`${label('heading')} 2`}
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title={`${label('heading')} 3`}
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Font size controls */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => {
              const newSize = Math.max(14, settings.fontSize - 2)
              updateSettings({ fontSize: newSize })
            }}
            title={label('smallerText')}
          >
            <MinusCircle className="w-4 h-4" />
          </ToolbarButton>
          <span className={`min-w-[2.5rem] text-center text-xs ${styles.text}`}>
            {Math.round(settings.fontSize)}px
          </span>
          <ToolbarButton
            onClick={() => {
              const newSize = Math.min(28, settings.fontSize + 2)
              updateSettings({ fontSize: newSize })
            }}
            title={label('largerText')}
          >
            <PlusCircle className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <Divider />

        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title={`${label('bold')} (${command}B)`}
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title={`${label('italic')} (${command}I)`}
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title={label('strike')}
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive('highlight')}
          title={label('highlight')}
        >
          <Highlighter className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title={label('bulletList')}
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title={label('orderedList')}
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive('taskList')}
          title={label('taskList')}
        >
          <ListChecks className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Block elements */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title={label('quote')}
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title={label('codeBlock')}
        >
          <Code2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title={label('rule')}
        >
          <Minus className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Insert elements */}
        <ToolbarButton onClick={addLink} isActive={editor.isActive('link')} title={label('insertLink')}>
          <Link className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={addImage} title={label('insertImage')}>
          <Image className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={addTable} isActive={editor.isActive('table')} title={label('insertTable')}>
          <Table className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Save button */}
        <button
          onClick={onSave}
          disabled={!hasUnsavedChanges || isSaving}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-all ${
            hasUnsavedChanges
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          title={`${label('save')} (${command}S)`}
        >
          <Save className="w-3.5 h-3.5" />
          <span className="text-xs whitespace-nowrap">{label(isSaving ? 'saving' : 'save')}</span>
        </button>
      </div>
    </div>
  )
}