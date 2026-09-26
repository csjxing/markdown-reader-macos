import { Book } from '../../store'
import { FileText, Clock, AlertCircle } from 'lucide-react'
import { useTranslation } from '../../hooks/useTranslation'
import BookActions from './BookActions'

interface BookListProps {
  books: Book[]
  onSelectBook: (book: Book) => void
  onRemoveBook: (id: string) => void
  theme: 'light' | 'dark' | 'sepia'
  missingFiles?: Set<string>
}

export default function BookList({ books, onSelectBook, onRemoveBook, theme, missingFiles }: BookListProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-2">
      {books.map(book => (
        <div key={book.id} role="button" tabIndex={0} aria-label={book.title}
          onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onSelectBook(book) } }}
          className={`group flex items-center justify-between gap-3 p-4 rounded-lg cursor-pointer transition-colors ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50 shadow-sm'}`}
          onClick={() => onSelectBook(book)}>
          <FileText className="w-7 h-7 text-blue-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate">{book.title}</h4>
            <p title={book.path} className="text-xs text-gray-500 truncate mt-0.5">{book.path}</p>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
              <span>{book.wordCount.toLocaleString()} {t('bookshelf.chars')}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(book.lastRead).toLocaleDateString()}</span>
              {missingFiles?.has(book.id) && <span className="flex items-center gap-1 text-red-500"><AlertCircle className="w-3 h-3" />{t('bookshelf.fileMissing')}</span>}
            </div>
          </div>
          <div className="w-24 flex-shrink-0 hidden md:block">
            <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${book.progress}%` }} /></div>
            <p className="text-xs mt-1 text-right text-gray-500">{book.progress}%</p>
          </div>
          <BookActions book={book} onRemove={() => onRemoveBook(book.id)} />
        </div>
      ))}
    </div>
  )
}
