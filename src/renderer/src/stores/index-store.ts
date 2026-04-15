import { create } from 'zustand';
import type { IndexInfo, CreateIndexRequest } from '../../../shared/types';

interface IndexState {
  indexes: IndexInfo[];
  isLoading: boolean;
  error: string | null;

  loadIndexes: (database: string, collection: string) => Promise<void>;
  createIndex: (request: CreateIndexRequest) => Promise<void>;
  dropIndex: (database: string, collection: string, indexName: string) => Promise<void>;
  reset: () => void;
}

export const useIndexStore = create<IndexState>((set) => ({
  indexes: [],
  isLoading: false,
  error: null,

  loadIndexes: async (database: string, collection: string) => {
    set({ isLoading: true, error: null });
    try {
      const indexes: IndexInfo[] = await window.api.listIndexes(database, collection);
      set({ indexes, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load indexes'
      });
    }
  },

  createIndex: async (request: CreateIndexRequest) => {
    set({ isLoading: true, error: null });
    try {
      await window.api.createIndex(request);
      const indexes: IndexInfo[] = await window.api.listIndexes(
        request.database,
        request.collection
      );
      set({ indexes, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to create index'
      });
      throw err;
    }
  },

  dropIndex: async (database: string, collection: string, indexName: string) => {
    set({ isLoading: true, error: null });
    try {
      await window.api.dropIndex(database, collection, indexName);
      const indexes: IndexInfo[] = await window.api.listIndexes(database, collection);
      set({ indexes, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to drop index'
      });
      throw err;
    }
  },

  reset: () => {
    set({ indexes: [], isLoading: false, error: null });
  }
}));
