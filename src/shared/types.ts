export interface ConnectionConfig {
  id: string;
  name: string;
  mode: 'uri' | 'form';
  uri?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  authMechanism?: string;
  tls?: boolean;
  lastUsed?: number;
}

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
