import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { connectionManager } from '../services/connection-manager';
import { assertDbName, assertCollectionName } from '../lib/validators';
import type { IndexInfo, CreateIndexRequest } from '../../shared/types';

export function registerIndexHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.INDEX_LIST,
    async (_event, database: string, collection: string): Promise<IndexInfo[]> => {
      assertDbName(database);
      assertCollectionName(collection);
      const client = connectionManager.getClient();
      const db = client.db(database);
      const coll = db.collection(collection);

      const indexes = await coll.listIndexes().toArray();

      // Get index sizes from collStats
      let indexSizes: Record<string, number> = {};
      try {
        const stats = await db.command({ collStats: collection });
        indexSizes = stats.indexSizes || {};
      } catch {
        // collStats may fail on some collection types; fall back to 0
      }

      return indexes.map((idx) => ({
        name: idx.name,
        key: idx.key,
        unique: idx.unique ?? false,
        sparse: idx.sparse ?? false,
        expireAfterSeconds: idx.expireAfterSeconds,
        size: indexSizes[idx.name] ?? 0,
        isDefault: idx.name === '_id_'
      }));
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.INDEX_CREATE,
    async (_event, request: CreateIndexRequest): Promise<string> => {
      assertDbName(request.database);
      assertCollectionName(request.collection);

      const keys = request.keys;
      if (!keys || typeof keys !== 'object' || Object.keys(keys).length === 0) {
        throw new Error('At least one index key field is required');
      }

      for (const [field, direction] of Object.entries(keys)) {
        if (typeof field !== 'string' || field.length === 0) {
          throw new Error('Index key field name must be a non-empty string');
        }
        if (direction !== 1 && direction !== -1) {
          throw new Error(`Index key direction must be 1 or -1, got: ${direction}`);
        }
      }

      const client = connectionManager.getClient();
      const coll = client.db(request.database).collection(request.collection);
      const result = await coll.createIndex(keys, request.options || {});
      return result;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.INDEX_DROP,
    async (_event, database: string, collection: string, indexName: string): Promise<void> => {
      assertDbName(database);
      assertCollectionName(collection);

      if (typeof indexName !== 'string' || indexName.length === 0) {
        throw new Error('Index name must be a non-empty string');
      }
      if (indexName === '_id_') {
        throw new Error('Cannot drop the default _id index');
      }

      const client = connectionManager.getClient();
      const coll = client.db(database).collection(collection);
      await coll.dropIndex(indexName);
    }
  );
}
