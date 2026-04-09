import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import type { FullConnectionConfig, QueryRequest } from '../shared/types';

const api = {
  // Connection
  connect: (config: FullConnectionConfig) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONNECTION_CONNECT, config),
  disconnect: () => ipcRenderer.invoke(IPC_CHANNELS.CONNECTION_DISCONNECT),
  testConnection: (config: FullConnectionConfig) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONNECTION_TEST, config),
  saveConnection: (config: FullConnectionConfig) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONNECTION_SAVE, config),
  listConnections: () => ipcRenderer.invoke(IPC_CHANNELS.CONNECTION_LIST),
  deleteConnection: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.CONNECTION_DELETE, id),

  // Database
  listDatabases: () => ipcRenderer.invoke(IPC_CHANNELS.DATABASE_LIST),
  listCollections: (database: string) => ipcRenderer.invoke(IPC_CHANNELS.COLLECTION_LIST, database),
  collectionStats: (database: string, collection: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.COLLECTION_STATS, database, collection),

  // Query
  executeQuery: (request: QueryRequest) => ipcRenderer.invoke(IPC_CHANNELS.QUERY_EXECUTE, request),
  explainQuery: (request: QueryRequest) => ipcRenderer.invoke(IPC_CHANNELS.QUERY_EXPLAIN, request),

  // Document
  updateDocument: (database: string, collection: string, id: string, update: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.DOCUMENT_UPDATE, database, collection, id, update),
  deleteDocument: (database: string, collection: string, id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.DOCUMENT_DELETE, database, collection, id),
  insertDocument: (database: string, collection: string, doc: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.DOCUMENT_INSERT, database, collection, doc),

  // Schema
  sampleSchema: (database: string, collection: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SCHEMA_SAMPLE, database, collection),

  // History
  listHistory: () => ipcRenderer.invoke(IPC_CHANNELS.HISTORY_LIST),
  clearHistory: () => ipcRenderer.invoke(IPC_CHANNELS.HISTORY_CLEAR),
  searchHistory: (query: string) => ipcRenderer.invoke(IPC_CHANNELS.HISTORY_SEARCH, query),
  deleteHistoryEntry: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.HISTORY_DELETE, id)
};

export type MongonautAPI = typeof api;

contextBridge.exposeInMainWorld('api', api);
