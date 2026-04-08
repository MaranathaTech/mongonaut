import { create } from 'zustand';
import type { QueryHistoryEntry } from '../../../shared/types';

interface HistoryState {
  entries: QueryHistoryEntry[];
  filteredEntries: QueryHistoryEntry[];
  searchQuery: string;
  isLoading: boolean;

  loadHistory: () => Promise<void>;
  searchHistory: (query: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  entries: [],
  filteredEntries: [],
  searchQuery: '',
  isLoading: false,

  loadHistory: async () => {
    set({ isLoading: true });
    try {
      const entries = (await window.api.listHistory()) as QueryHistoryEntry[];
      set({ entries, filteredEntries: entries, searchQuery: '', isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  searchHistory: async (query: string) => {
    if (!query.trim()) {
      const entries = (await window.api.listHistory()) as QueryHistoryEntry[];
      set({ entries, filteredEntries: entries, searchQuery: query });
      return;
    }
    try {
      const filteredEntries = (await window.api.searchHistory(query)) as QueryHistoryEntry[];
      set({ filteredEntries, searchQuery: query });
    } catch {
      // keep current entries on error
    }
  },

  clearHistory: async () => {
    await window.api.clearHistory();
    set({ entries: [], filteredEntries: [], searchQuery: '' });
  },

  deleteEntry: async (id: string) => {
    await window.api.deleteHistoryEntry(id);
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== id),
      filteredEntries: state.filteredEntries.filter((e) => e.id !== id)
    }));
  },

  setSearchQuery: (searchQuery: string) => set({ searchQuery })
}));
