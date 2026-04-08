import { create } from 'zustand';
import type { DatabaseInfo, CollectionInfo } from '../../../shared/types';

interface BrowserState {
  databases: DatabaseInfo[];
  collections: Record<string, CollectionInfo[]>;
  selectedCollection: { database: string; collection: string } | null;
  isLoading: boolean;

  loadDatabases: () => Promise<void>;
  loadCollections: (database: string) => Promise<void>;
  selectCollection: (database: string, collection: string) => void;
  clearSelection: () => void;
  refresh: () => Promise<void>;
}

export const useBrowserStore = create<BrowserState>((set) => ({
  databases: [],
  collections: {},
  selectedCollection: null,
  isLoading: false,

  loadDatabases: async () => {
    set({ isLoading: true });
    try {
      const databases = await window.api.listDatabases();
      set({ databases, isLoading: false });
    } catch {
      set({ databases: [], isLoading: false });
    }
  },

  loadCollections: async (database: string) => {
    try {
      const cols = await window.api.listCollections(database);
      set((state) => ({
        collections: { ...state.collections, [database]: cols }
      }));
    } catch {
      set((state) => ({
        collections: { ...state.collections, [database]: [] }
      }));
    }
  },

  selectCollection: (database, collection) => set({ selectedCollection: { database, collection } }),

  clearSelection: () => set({ selectedCollection: null }),

  refresh: async () => {
    set({ collections: {}, isLoading: true });
    try {
      const databases = await window.api.listDatabases();
      set({ databases, isLoading: false });
    } catch {
      set({ databases: [], isLoading: false });
    }
  }
}));
