import { create } from 'zustand'
import type { QueryResult } from '../../../shared/types'
import { useHistoryStore } from './history-store'

interface LastQuery {
  database: string
  collection: string
  queryText: string
}

interface ResultsState {
  results: QueryResult | null
  explainResult: unknown | null
  isLoading: boolean
  error: string | null
  viewMode: 'table' | 'json'
  page: number
  pageSize: number
  lastQuery: LastQuery | null

  executeQuery: (database: string, collection: string, queryText: string) => Promise<void>
  explainQuery: (database: string, collection: string, queryText: string) => Promise<void>
  setViewMode: (mode: 'table' | 'json') => void
  goToPage: (page: number) => Promise<void>
  changePageSize: (size: number) => Promise<void>
  clearResults: () => void
  clearError: () => void
}

async function runQuery(
  database: string,
  collection: string,
  queryText: string,
  page: number,
  pageSize: number,
  set: (partial: Partial<ResultsState>) => void
): Promise<void> {
  set({ isLoading: true, error: null, explainResult: null })
  try {
    const result = await window.api.executeQuery({
      database,
      collection,
      queryText,
      page,
      pageSize
    })

    if (result && 'error' in result) {
      set({ error: (result as { error: string }).error, isLoading: false })
      return
    }

    set({ results: result as QueryResult, isLoading: false, page })
  } catch (err) {
    set({
      error: err instanceof Error ? err.message : String(err),
      isLoading: false
    })
  }
}

export const useResultsStore = create<ResultsState>((set, get) => ({
  results: null,
  explainResult: null,
  isLoading: false,
  error: null,
  viewMode: 'table',
  page: 1,
  pageSize: 50,
  lastQuery: null,

  executeQuery: async (database, collection, queryText) => {
    set({ page: 1, lastQuery: { database, collection, queryText } })
    const { pageSize } = get()
    await runQuery(database, collection, queryText, 1, pageSize, set)
    // Refresh history panel after execution (auto-save happens in main process)
    useHistoryStore.getState().loadHistory()
  },

  explainQuery: async (database, collection, queryText) => {
    set({ isLoading: true, error: null })
    try {
      const result = await window.api.explainQuery({
        database,
        collection,
        queryText
      })

      if (result && typeof result === 'object' && 'error' in result) {
        set({ error: (result as { error: string }).error, isLoading: false })
        return
      }

      set({ explainResult: result, viewMode: 'json', isLoading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false
      })
    }
  },

  setViewMode: (viewMode) => set({ viewMode }),

  goToPage: async (page) => {
    const { lastQuery, pageSize } = get()
    if (!lastQuery) return
    set({ page })
    await runQuery(lastQuery.database, lastQuery.collection, lastQuery.queryText, page, pageSize, set)
  },

  changePageSize: async (pageSize) => {
    const { lastQuery } = get()
    set({ pageSize, page: 1 })
    if (!lastQuery) return
    await runQuery(lastQuery.database, lastQuery.collection, lastQuery.queryText, 1, pageSize, set)
  },

  clearResults: () =>
    set({ results: null, explainResult: null, error: null, page: 1, lastQuery: null }),

  clearError: () => set({ error: null })
}))
