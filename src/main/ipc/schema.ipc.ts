import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { schemaSampler } from '../services/schema-sampler'
import type { SchemaField } from '../../shared/types'

export function registerSchemaHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.SCHEMA_SAMPLE,
    async (_event, database: string, collection: string): Promise<SchemaField[]> => {
      return schemaSampler.sampleSchema(database, collection)
    }
  )
}
