export const IPC_CHANNELS = {
  // Connection
  CONNECTION_CONNECT: 'connection:connect',
  CONNECTION_DISCONNECT: 'connection:disconnect',
  CONNECTION_TEST: 'connection:test',
  CONNECTION_SAVE: 'connection:save',
  CONNECTION_LIST: 'connection:list',
  CONNECTION_DELETE: 'connection:delete',

  // Database
  DATABASE_LIST: 'database:list',
  COLLECTION_LIST: 'collection:list',
  COLLECTION_STATS: 'collection:stats',

  // Query
  QUERY_EXECUTE: 'query:execute',
  QUERY_EXPLAIN: 'query:explain',

  // Document
  DOCUMENT_UPDATE: 'document:update',
  DOCUMENT_DELETE: 'document:delete',
  DOCUMENT_INSERT: 'document:insert',
  DOCUMENT_CLONE: 'document:clone',

  // Schema
  SCHEMA_SAMPLE: 'schema:sample',

  // History
  HISTORY_LIST: 'history:list',
  HISTORY_CLEAR: 'history:clear',
  HISTORY_SEARCH: 'history:search'
} as const
