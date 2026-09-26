import { useStore } from '../../store'
import { motion } from 'framer-motion'

export default function ProgressBar() {
  const { currentBook, settings } = useStore()

  if (!currentBook) return null

  const progress = currentBook.progress || 0

  return (
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 overflow-hidden">
      <motion.div
        className="h-full bg-blue-500"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3 }}
      />

      {/* Hover indicator */}
      <div
        className={`absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium shadow-lg transition-all ${
          settings.theme === 'dark'
            ? 'bg-gray-800 text-gray-200'
            : 'bg-white text-gray-700'
        } opacity-0 hover:opacity-100 group-hover:opacity-100`}
        style={{ opacity: 0 }}
      >
        {progress}% read
      </div>
    </div>
  )
}