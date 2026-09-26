import { Editor } from '@tiptap/react'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Minus, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface TableBubbleMenuProps {
  editor: Editor
  theme: 'light' | 'dark' | 'sepia'
}

export default function TableBubbleMenu({ editor, theme }: TableBubbleMenuProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [showAddModal, setShowAddModal] = useState<'row' | 'col' | null>(null)
  const [addCount, setAddCount] = useState(1)
  const menuRef = useRef<HTMLDivElement>(null)

  const themeStyles = {
    light: { bg: 'bg-white', border: 'border-gray-200', shadow: 'shadow-lg', hover: 'hover:bg-gray-100' },
    dark: { bg: 'bg-gray-800', border: 'border-gray-600', shadow: 'shadow-xl', hover: 'hover:bg-gray-700' },
    sepia: { bg: 'bg-amber-50', border: 'border-amber-200', shadow: 'shadow-lg', hover: 'hover:bg-amber-100' },
  }
  const s = themeStyles[theme]

  // Handle right-click on table
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Check if clicked on a table or inside a table
      const table = target.closest('.editor-table')
      const tableCell = target.closest('td, th')

      if (table || tableCell || editor.isActive('table')) {
        e.preventDefault()
        e.stopPropagation()
        setShowMenu(true)
        setMenuPos({ x: e.clientX, y: e.clientY })
      }
    }

    const handleClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setShowMenu(false)
        setShowAddModal(null)
      }
    }

    // Use capture phase to ensure we catch the event
    document.addEventListener('contextmenu', handleContextMenu, true)
    document.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true)
      document.removeEventListener('click', handleClick)
    }
  }, [editor])

  // Table operations
  const addRowAbove = () => {
    editor.chain().focus().addRowBefore().run()
    setShowMenu(false)
  }

  const addRowBelow = () => {
    editor.chain().focus().addRowAfter().run()
    setShowMenu(false)
  }

  const addColLeft = () => {
    editor.chain().focus().addColumnBefore().run()
    setShowMenu(false)
  }

  const addColRight = () => {
    editor.chain().focus().addColumnAfter().run()
    setShowMenu(false)
  }

  const deleteRow = () => {
    editor.chain().focus().deleteRow().run()
    setShowMenu(false)
  }

  const deleteCol = () => {
    editor.chain().focus().deleteColumn().run()
    setShowMenu(false)
  }

  const deleteTable = () => {
    editor.chain().focus().deleteTable().run()
    setShowMenu(false)
  }

  const addMultipleRows = (count: number) => {
    const chain = editor.chain().focus()
    for (let i = 0; i < count; i++) chain.addRowAfter()
    chain.run()
    setShowAddModal(null)
    setShowMenu(false)
  }

  const addMultipleCols = (count: number) => {
    const chain = editor.chain().focus()
    for (let i = 0; i < count; i++) chain.addColumnAfter()
    chain.run()
    setShowAddModal(null)
    setShowMenu(false)
  }

  const mergeCells = () => {
    editor.chain().focus().mergeCells().run()
    setShowMenu(false)
  }

  const splitCell = () => {
    editor.chain().focus().splitCell().run()
    setShowMenu(false)
  }

  // Only show menu when table is active
  if (!showMenu || !editor.isActive('table')) return null

  return createPortal(
    <>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`fixed ${s.bg} border ${s.border} rounded-lg ${s.shadow} py-0.5 min-w-[140px] z-[1000] text-xs`}
        style={{ left: menuPos.x, top: menuPos.y }}
      >
        {/* Row operations */}
        <div className="px-2 py-0.5 text-[10px] text-gray-400 border-b border-inherit">行操作</div>
        <button onClick={addRowAbove} className={`w-full text-left px-2 py-0.5 flex items-center gap-1.5 ${s.hover}`}>
          <Plus className="w-3 h-3" /> 在上方插入行
        </button>
        <button onClick={addRowBelow} className={`w-full text-left px-2 py-0.5 flex items-center gap-1.5 ${s.hover}`}>
          <Plus className="w-3 h-3" /> 在下方插入行
        </button>
        <button onClick={() => setShowAddModal('row')} className={`w-full text-left px-2 py-0.5 flex items-center gap-1.5 ${s.hover}`}>
          <Plus className="w-3 h-3" /> 批量插入行...
        </button>
        <button onClick={deleteRow} className="w-full text-left px-2 py-0.5 text-red-500 hover:bg-red-50 flex items-center gap-1.5">
          <Minus className="w-3 h-3" /> 删除当前行
        </button>

        <div className={`my-0.5 border-t ${s.border}`} />

        {/* Column operations */}
        <div className="px-2 py-0.5 text-[10px] text-gray-400 border-b border-inherit">列操作</div>
        <button onClick={addColLeft} className={`w-full text-left px-2 py-0.5 flex items-center gap-1.5 ${s.hover}`}>
          <Plus className="w-3 h-3" /> 在左侧插入列
        </button>
        <button onClick={addColRight} className={`w-full text-left px-2 py-0.5 flex items-center gap-1.5 ${s.hover}`}>
          <Plus className="w-3 h-3" /> 在右侧插入列
        </button>
        <button onClick={() => setShowAddModal('col')} className={`w-full text-left px-2 py-0.5 flex items-center gap-1.5 ${s.hover}`}>
          <Plus className="w-3 h-3" /> 批量插入列...
        </button>
        <button onClick={deleteCol} className="w-full text-left px-2 py-0.5 text-red-500 hover:bg-red-50 flex items-center gap-1.5">
          <Minus className="w-3 h-3" /> 删除当前列
        </button>

        <div className={`my-0.5 border-t ${s.border}`} />

        {/* Cell operations */}
        <div className="px-2 py-0.5 text-[10px] text-gray-400 border-b border-inherit">单元格操作</div>
        <button onClick={mergeCells} className={`w-full text-left px-2 py-0.5 flex items-center gap-1.5 ${s.hover}`}>
          合并单元格
        </button>
        <button onClick={splitCell} className={`w-full text-left px-2 py-0.5 flex items-center gap-1.5 ${s.hover}`}>
          拆分单元格
        </button>

        <div className={`my-0.5 border-t ${s.border}`} />

        {/* Delete table */}
        <button onClick={deleteTable} className="w-full text-left px-2 py-0.5 text-red-500 hover:bg-red-50 flex items-center gap-1.5">
          <Trash2 className="w-3 h-3" /> 删除整个表格
        </button>
      </motion.div>

      {/* Add modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <div className="fixed inset-0 bg-black/20 z-[1001]" onClick={() => setShowAddModal(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${s.bg} rounded-lg p-3 min-w-[200px] z-[1002] shadow-xl border ${s.border} text-xs`}
            >
              <h3 className="font-medium mb-2">批量插入{showAddModal === 'row' ? '行' : '列'}</h3>
              <div className="flex items-center gap-2 mb-3">
                <span>插入</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={addCount}
                  onChange={(e) => setAddCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  className="w-14 px-2 py-0.5 border rounded text-center text-xs"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      showAddModal === 'row' ? addMultipleRows(addCount) : addMultipleCols(addCount)
                    }
                  }}
                />
                <span>{showAddModal === 'row' ? '行' : '列'}</span>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAddModal(null)} className={`px-3 py-0.5 rounded ${s.hover}`}>取消</button>
                <button
                  onClick={() => showAddModal === 'row' ? addMultipleRows(addCount) : addMultipleCols(addCount)}
                  className="px-3 py-0.5 rounded bg-blue-500 text-white hover:bg-blue-600"
                >
                  确定
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>,
    document.body
  )
}