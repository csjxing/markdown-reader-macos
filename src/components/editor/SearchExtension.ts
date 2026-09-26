import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

interface SearchOptions {
  searchQuery: string
  currentIndex: number
}

interface SearchPluginState {
  decorations: DecorationSet
  results: number
  query: string
  currentIndex: number
}

export const searchPluginKey = new PluginKey<SearchPluginState>('search')

export const SearchExtension = Extension.create<SearchOptions>({
  name: 'search',

  addOptions() {
    return {
      searchQuery: '',
      currentIndex: 0,
    }
  },

  addProseMirrorPlugins() {
    const pluginKey = searchPluginKey

    return [
      new Plugin({
        key: pluginKey,
        state: {
          init(): SearchPluginState {
            return {
              decorations: DecorationSet.empty,
              results: 0,
              query: '',
              currentIndex: 0,
            }
          },
          apply(tr, oldState): SearchPluginState {
            const meta = tr.getMeta(pluginKey)

            // Handle clear action
            if (meta?.clear) {
              return {
                decorations: DecorationSet.empty,
                results: 0,
              query: '',
              currentIndex: 0,
              }
            }

            // Get search query from meta or use existing
            const query = meta?.query ?? oldState.query
            const currentIndex = meta?.currentIndex ?? oldState.currentIndex

            if (!query) {
              return {
                decorations: DecorationSet.empty,
                results: 0,
              query: '',
              currentIndex: 0,
              }
            }

            // Create decorations for search results
            const decorations: Decoration[] = []
            const searchRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')

            let resultIndex = 0

            tr.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return

              const nodeText = node.text
              let localMatch

              while ((localMatch = searchRegex.exec(nodeText)) !== null) {
                const from = pos + localMatch.index
                const to = from + localMatch[0].length

                const isCurrent = resultIndex === currentIndex

                decorations.push(
                  Decoration.inline(from, to, {
                    class: isCurrent ? 'search-highlight-current' : 'search-highlight',
                  })
                )

                resultIndex++
              }
            })

            return {
              decorations: DecorationSet.create(tr.doc, decorations),
              results: resultIndex,
              query,
              currentIndex,
            }
          },
        },
        props: {
          decorations(state) {
            return pluginKey.getState(state)?.decorations ?? DecorationSet.empty
          },
        },
      }),
    ]
  },
})

// Helper functions to interact with the search plugin

export function setSearchQuery(view: any, query: string, currentIndex: number = 0) {
  const tr = view.state.tr.setMeta(searchPluginKey, { query, currentIndex })
  view.dispatch(tr)
}

export function clearSearchQuery(view: any) {
  const tr = view.state.tr.setMeta(searchPluginKey, { clear: true })
  view.dispatch(tr)
}

export function getSearchResults(view: any): number {
  const state = searchPluginKey.getState(view.state)
  return state?.results ?? 0
}
