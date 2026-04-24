import { ipcMain, dialog, BrowserWindow } from 'electron';
import type { Document, Filter } from 'mongodb';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { connectionManager } from '../services/connection-manager';
import { assertDbName, assertCollectionName } from '../lib/validators';
import { serializeDocument, deserializeDocument } from '../lib/safe-bson';
import { assertSafeDocumentId, assertNoTopLevelOperators } from './document-validators';

function parseDocumentId(documentId: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(documentId);
  } catch {
    throw new Error('Invalid document id: not valid JSON');
  }
  assertSafeDocumentId(parsed);
  return parsed;
}

async function confirmDestructive(
  title: string,
  message: string,
  detail?: string
): Promise<boolean> {
  const parent = BrowserWindow.getFocusedWindow();
  const options = {
    type: 'warning' as const,
    buttons: ['Cancel', 'Confirm'],
    defaultId: 0,
    cancelId: 0,
    title,
    message,
    detail,
    noLink: true
  };
  const result = parent
    ? await dialog.showMessageBox(parent, options)
    : await dialog.showMessageBox(options);
  return result.response === 1;
}

export function registerDocumentHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.DOCUMENT_UPDATE,
    async (
      _event,
      database: string,
      collection: string,
      documentId: string,
      updatedDocument: unknown
    ) => {
      try {
        assertDbName(database);
        assertCollectionName(collection);
        const client = connectionManager.getClient();
        const col = client.db(database).collection(collection);

        assertNoTopLevelOperators(updatedDocument, 'Update payload');

        const parsedId = parseDocumentId(documentId);
        const deserializedId = (
          deserializeDocument({ _id: parsedId }) as Record<string, unknown>
        )._id;

        const deserialized = deserializeDocument(updatedDocument) as Record<string, unknown>;

        // Check if _id was changed
        const newId = deserialized._id;
        const idChanged =
          newId !== undefined && JSON.stringify(newId) !== JSON.stringify(deserializedId);

        if (idChanged) {
          const ok = await confirmDestructive(
            'Change document ID',
            'The _id field has been modified.',
            'Saving will create a new document at the new _id and delete the original. Continue?'
          );
          if (!ok) {
            return { success: true, cancelled: true };
          }

          // Insert new document with new _id, then delete the original
          await col.insertOne(deserialized as Document);
          await col.deleteOne({ _id: deserializedId } as Filter<Document>);
          return { success: true, modifiedCount: 1 };
        }

        // Remove _id from the update payload — can't update _id
        delete deserialized._id;

        const result = await col.replaceOne(
          { _id: deserializedId } as Filter<Document>,
          deserialized
        );
        return { success: true, modifiedCount: result.modifiedCount };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DOCUMENT_DELETE,
    async (_event, database: string, collection: string, documentId: string) => {
      try {
        assertDbName(database);
        assertCollectionName(collection);

        const ok = await confirmDestructive(
          'Delete document',
          `Delete document from ${database}.${collection}?`,
          'This action cannot be undone.'
        );
        if (!ok) {
          return { success: true, cancelled: true };
        }

        const client = connectionManager.getClient();
        const col = client.db(database).collection(collection);

        const parsedId = parseDocumentId(documentId);
        const deserializedId = (
          deserializeDocument({ _id: parsedId }) as Record<string, unknown>
        )._id;

        const result = await col.deleteOne({ _id: deserializedId } as Filter<Document>);
        return { success: true, deletedCount: result.deletedCount };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DOCUMENT_INSERT,
    async (_event, database: string, collection: string, document: unknown) => {
      try {
        assertDbName(database);
        assertCollectionName(collection);
        const client = connectionManager.getClient();
        const col = client.db(database).collection(collection);

        assertNoTopLevelOperators(document, 'Insert payload');

        const deserialized = deserializeDocument(document) as Record<string, unknown>;

        const result = await col.insertOne(deserialized);
        return { success: true, insertedId: serializeDocument(result.insertedId) };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      }
    }
  );
}
