import { create } from 'zustand'
import type { ConnectionConfig, DatabaseInfo } from '../../../shared/types'

interface ConnectionState {
  isConnected: boolean
  connectionConfig: ConnectionConfig | null
  databases: DatabaseInfo[]
  error: string | null

  connect: (config: ConnectionConfig) => void
  disconnect: () => void
  setDatabases: (databases: DatabaseInfo[]) => void
  setError: (error: string | null) => void
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  isConnected: false,
  connectionConfig: null,
  databases: [],
  error: null,

  connect: (config) => set({ isConnected: true, connectionConfig: config, error: null }),
  disconnect: () =>
    set({ isConnected: false, connectionConfig: null, databases: [], error: null }),
  setDatabases: (databases) => set({ databases }),
  setError: (error) => set({ error })
}))
