import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { connectionManager } from '../services/connection-manager'
import { serializeDocument, deserializeDocument } from '../lib/safe-bson'

export function registerDocumentHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.DOCUMENT_UPDATE,
    async (_event, database: string, collection: string, documentId: string, updatedDocument: unknown) => {
      try {
        const client = connectionManager.getClient()
        const col = client.db(database).collection(collection)

        const deserialized = deserializeDocument(updatedDocument) as Record<string, unknown>
        const deserializedId = (deserializeDocument({ _id: JSON.parse(documentId) }) as Record<string, unknown>)._id

        // Remove _id from the update payload — can't update _id
        delete deserialized._id

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await col.replaceOne({ _id: deserializedId as any }, deserialized)
        return { success: true, modifiedCount: result.modifiedCount }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return { success: false, error: message }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.DOCUMENT_DELETE,
    async (_event, database: string, collection: string, documentId: string) => {
      try {
        const client = connectionManager.getClient()
        const col = client.db(database).collection(collection)

        const deserializedId = (deserializeDocument({ _id: JSON.parse(documentId) }) as Record<string, unknown>)._id

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await col.deleteOne({ _id: deserializedId as any })
        return { success: true, deletedCount: result.deletedCount }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return { success: false, error: message }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.DOCUMENT_INSERT,
    async (_event, database: string, collection: string, document: unknown) => {
      try {
        const client = connectionManager.getClient()
        const col = client.db(database).collection(collection)

        const deserialized = deserializeDocument(document)

        const result = await col.insertOne(deserialized as Record<string, unknown>)
        return { success: true, insertedId: serializeDocument(result.insertedId) }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return { success: false, error: message }
      }
    }
  )
}
