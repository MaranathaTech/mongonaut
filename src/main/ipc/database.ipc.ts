import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { connectionManager } from '../services/connection-manager';
import type { DatabaseInfo, CollectionInfo, CollectionStats } from '../../shared/types';

export function registerDatabaseHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.DATABASE_LIST, async (): Promise<DatabaseInfo[]> => {
    const client = connectionManager.getClient();
    const result = await client.db('admin').admin().listDatabases();
    return result.databases.map((db) => ({
      name: db.name,
      sizeOnDisk: db.sizeOnDisk ?? 0,
      empty: db.empty ?? false
    }));
  });

  ipcMain.handle(
    IPC_CHANNELS.COLLECTION_LIST,
    async (_event, database: string): Promise<CollectionInfo[]> => {
      const client = connectionManager.getClient();
      const collections = await client.db(database).listCollections().toArray();
      return collections.map((col) => ({
        name: col.name,
        type: col.type ?? 'collection'
      }));
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.COLLECTION_STATS,
    async (_event, database: string, collection: string): Promise<CollectionStats> => {
      const client = connectionManager.getClient();
      const db = client.db(database);
      const stats = await db.command({ collStats: collection });
      return {
        ns: stats.ns,
        count: stats.count,
        size: stats.size,
        avgObjSize: stats.avgObjSize ?? 0,
        storageSize: stats.storageSize,
        indexes: stats.nindexes,
        indexSize: stats.totalIndexSize
      };
    }
  );
}
