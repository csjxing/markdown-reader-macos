import { Star, X } from 'lucide-react'
import { type Book, useStore } from '../../store'
import { useTranslation } from '../../hooks/useTranslation'

export default function BookActions({ book, onRemove }: { book: Book; onRemove?: () => void }) {
  const { t } = useTranslation()
  const actionClass = 'p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus-visible:ring-2 focus-visible:ring-blue-500'
  return (
    <div className="flex items-center gap-0.5" onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
      <button className={`${actionClass} ${book.favorite ? 'text-amber-500' : 'text-gray-500'}`}
        aria-pressed={!!book.favorite} title={t(book.favorite ? 'library.removeFavorite' : 'library.favorite')}
        aria-label={t(book.favorite ? 'library.removeFavorite' : 'library.favorite')}
        onClick={() => useStore.getState().toggleFavorite(book.id)}>
        <Star className="w-4 h-4" fill={book.favorite ? 'currentColor' : 'none'} />
      </button>
      {onRemove && <button className={`${actionClass} text-gray-500 hover:text-red-500`} onClick={onRemove}
        title={t('actions.remove')} aria-label={t('actions.remove')}><X className="w-4 h-4" /></button>}
    </div>
  )
}
