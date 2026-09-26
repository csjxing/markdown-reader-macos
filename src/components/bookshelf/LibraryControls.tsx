import { Search, Star, X } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { type LibraryFilters, type LibrarySort, useStore } from '../../store'
import { useTranslation } from '../../hooks/useTranslation'

export default function LibraryControls({ count }: { count: number }) {
  const { libraryFilters: filters, setLibraryFilters, librarySort, setLibrarySort, resetLibraryFilters } = useStore(useShallow(state => ({
    libraryFilters: state.libraryFilters, setLibraryFilters: state.setLibraryFilters,
    librarySort: state.librarySort, setLibrarySort: state.setLibrarySort, resetLibraryFilters: state.resetLibraryFilters
  })))
  const { t } = useTranslation()
  const hasFilters = filters.query || filters.favoriteOnly || filters.status !== 'all'
  const inputClass = 'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm min-w-0'
  return <div className="space-y-3 mb-5">
    <div className="flex flex-wrap gap-2">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={filters.query} onChange={event => setLibraryFilters({ query: event.target.value })}
          aria-label={t('library.search')} placeholder={t('library.search')} className={`${inputClass} w-full pl-9`} />
      </div>
      <button aria-pressed={filters.favoriteOnly} onClick={() => setLibraryFilters({ favoriteOnly: !filters.favoriteOnly })}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${filters.favoriteOnly ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' : inputClass}`}>
        <Star className="w-4 h-4" fill={filters.favoriteOnly ? 'currentColor' : 'none'} />{t('library.favorites')}
      </button>
      <select aria-label={t('library.sort')} value={librarySort} onChange={event => setLibrarySort(event.target.value as LibrarySort)} className={inputClass}>
        {(['recent', 'title', 'progress', 'added'] as const).map(sort => <option key={sort} value={sort}>{t(sort === 'added' ? 'library.added' : `sidebar.sortBy.${sort}`)}</option>)}
      </select>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <select aria-label={t('library.status')} value={filters.status} onChange={event => setLibraryFilters({ status: event.target.value as LibraryFilters['status'] })} className={inputClass}>
        {(['all', 'unread', 'reading', 'finished'] as const).map(status => <option key={status} value={status}>{t(status === 'all' ? 'library.allStatus' : `library.${status}`)}</option>)}
      </select>
      {hasFilters && <button onClick={resetLibraryFilters} className="flex items-center gap-1 px-2 py-1 text-sm text-blue-500"><X className="w-3 h-3" />{t('library.clearFilters')}</button>}
      <span className="ml-auto text-xs text-gray-500" aria-live="polite">{t('library.resultCount', { count })}</span>
    </div>
  </div>
}
