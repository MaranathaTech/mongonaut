import { create } from 'zustand'
import type { QueryResult } from '../../../shared/types'

interface ResultsState {
  results: QueryResult | null
  isLoading: boolean
  error: string | null
  viewMode: 'table' | 'json'

  setResults: (results: QueryResult | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  setViewMode: (mode: 'table' | 'json') => void
}

export const useResultsStore = create<ResultsState>((set) => ({
  results: null,
  isLoading: false,
  error: null,
  viewMode: 'table',

  setResults: (results) => set({ results, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setViewMode: (viewMode) => set({ viewMode })
}))
