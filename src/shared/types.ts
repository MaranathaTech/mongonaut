/** Shape stored on disk and sent to renderer. Never contains secrets. */
export interface StoredConnectionConfig {
  id: string;
  name: string;
  mode: 'uri' | 'form';
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  authMechanism?: string;
  tls?: boolean;
  lastUsed?: number;
}

/** Full shape used in main process when actually connecting. */
export interface FullConnectionConfig extends StoredConnectionConfig {
  password?: string;
  uri?: string;
}

/** @deprecated Use StoredConnectionConfig (renderer) or FullConnectionConfig (main). */
export type ConnectionConfig = FullConnectionConfig;

export interface QueryRequest {
  database: string;
  collection: string;
  queryText: string;
  page?: number;
  pageSize?: number;
}

export interface QueryResult {
  documents: SerializedDocument[];
  totalCount: number;
  executionTimeMs: number;
  page: number;
  pageSize: number;
}

export interface SerializedDocument {
  [key: string]: unknown;
}

export interface DatabaseInfo {
  name: string;
  sizeOnDisk: number;
  empty: boolean;
}

export interface CollectionInfo {
  name: string;
  type: string;
}

export interface CollectionStats {
  ns: string;
  count: number;
  size: number;
  avgObjSize: number;
  storageSize: number;
  indexes: number;
  indexSize: number;
}

export interface SchemaField {
  path: string;
  types: string[];
  frequency: number;
}

export interface QueryHistoryEntry {
  id: string;
  queryText: string;
  database: string;
  collection: string;
  executionTimeMs: number;
  resultCount: number;
  timestamp: number;
}

export interface TabInfo {
  id: string;
  title: string;
  database: string;
  collection: string;
  queryText: string;
  isDirty: boolean;
}

export interface IndexInfo {
  name: string;
  key: Record<string, number | string>;
  unique: boolean;
  sparse: boolean;
  expireAfterSeconds?: number;
  size: number;
  isDefault: boolean;
}

export interface CreateIndexRequest {
  database: string;
  collection: string;
  keys: Record<string, 1 | -1>;
  options?: {
    name?: string;
    unique?: boolean;
    sparse?: boolean;
    expireAfterSeconds?: number;
  };
}
