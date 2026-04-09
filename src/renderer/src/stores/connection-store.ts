import { create } from 'zustand';
import type { StoredConnectionConfig, FullConnectionConfig, DatabaseInfo } from '../../../shared/types';

interface ConnectionState {
  isConnected: boolean;
  connectionConfig: StoredConnectionConfig | null;
  databases: DatabaseInfo[];
  savedConnections: StoredConnectionConfig[];
  error: string | null;

  connect: (config: StoredConnectionConfig) => void;
  disconnect: () => Promise<void>;
  setDatabases: (databases: DatabaseInfo[]) => void;
  setError: (error: string | null) => void;
  loadSavedConnections: () => Promise<void>;
  saveConnection: (config: FullConnectionConfig) => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  isConnected: false,
  connectionConfig: null,
  databases: [],
  savedConnections: [],
  error: null,

  connect: (config) => set({ isConnected: true, connectionConfig: config, error: null }),

  disconnect: async () => {
    await window.api.disconnect();
    set({ isConnected: false, connectionConfig: null, databases: [], error: null });
  },

  setDatabases: (databases) => set({ databases }),
  setError: (error) => set({ error }),

  loadSavedConnections: async () => {
    const connections = await window.api.listConnections();
    set({ savedConnections: connections });
  },

  saveConnection: async (config) => {
    await window.api.saveConnection(config);
    const connections = await window.api.listConnections();
    set({ savedConnections: connections });
  },

  deleteConnection: async (id) => {
    await window.api.deleteConnection(id);
    const connections = await window.api.listConnections();
    set({ savedConnections: connections });
  }
}));
