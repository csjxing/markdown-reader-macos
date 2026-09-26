import { Book } from '../../store'
import { useTranslation } from '../../hooks/useTranslation'
import BookActions from './BookActions'
import { FileText, AlertCircle } from 'lucide-react'

interface BookCardProps {
  book: Book
  onClick: () => void
  onRemove?: () => void
  showProgress?: boolean
  theme: 'light' | 'dark' | 'sepia'
  fileMissing?: boolean
}

export default function BookCard({ book, onClick, onRemove, showProgress, theme, fileMissing }: BookCardProps) {
  const { t } = useTranslation()

  // Generate a consistent color based on book title
  const getColorFromTitle = (title: string) => {
    const colors = [
      'from-blue-400 to-blue-600',
      'from-green-400 to-green-600',
      'from-purple-400 to-purple-600',
      'from-orange-400 to-orange-600',
      'from-pink-400 to-pink-600',
      'from-indigo-400 to-indigo-600',
      'from-teal-400 to-teal-600',
      'from-red-400 to-red-600'
    ]
    const index = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[index % colors.length]
  }

  const progressColor =
    book.progress < 25 ? 'bg-gray-400'
    : book.progress < 50 ? 'bg-blue-500'
    : book.progress < 75 ? 'bg-green-500'
    : 'bg-yellow-500'

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={book.title}
      onKeyDown={event => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onClick()
        }
      }}
      className={`book-card cursor-pointer rounded-lg overflow-hidden relative ${
        theme === 'dark'
          ? 'bg-gray-800 hover:bg-gray-700'
          : 'bg-white shadow-md hover:shadow-lg'
      }`}
    >
      {/* Book cover - smaller colored area */}
      <div
        className={`aspect-[1/1] bg-gradient-to-br ${getColorFromTitle(book.title)} flex items-center justify-center relative`}
      >
        <FileText className="w-8 h-8 text-white/80" />

        {/* File missing indicator */}
        {fileMissing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center px-2">
              <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-1" />
              <span className="text-[10px] text-white">{t('bookshelf.fileMissing')}</span>
            </div>
          </div>
        )}

        {/* Cached file indicator */}
        {book.isCached && !fileMissing && (
          <div className="absolute top-1 left-1 bg-orange-500 text-white p-1 rounded-full" title={t('sidebar.cached')}>
            <AlertCircle className="w-3 h-3" />
          </div>
        )}

        {/* Progress indicator */}
        {book.progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
            <div
              className={`h-full ${progressColor} transition-all duration-300`}
              style={{ width: `${book.progress}%` }}
            />
          </div>
        )}

        {/* Completion badge */}
        {book.progress >= 100 && (
          <div className="absolute top-1 right-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
            {t('progress.done')}
          </div>
        )}
      </div>

      {/* Book info */}
      <div className="p-2">
        <h3 className="font-medium text-sm truncate" title={book.title}>
          {book.title}
        </h3>
        {showProgress && (
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-xs text-gray-500">
              {fileMissing
                ? t('bookshelf.fileMissing')
                : book.isCached
                  ? t('sidebar.cached')
                  : `${book.wordCount.toLocaleString()} ${t('bookshelf.chars')}`
              }
            </span>
            <span className="text-xs text-gray-500">{book.progress}%</span>
          </div>
        )}
        <div className="flex justify-end mt-1"><BookActions book={book} onRemove={onRemove} /></div>
      </div>
    </div>
  )
}