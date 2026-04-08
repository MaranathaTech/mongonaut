import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { queryExecutor } from '../services/query-executor'
import { addHistoryEntry } from './history.ipc'
import type { QueryRequest, QueryResult } from '../../shared/types'

export function registerQueryHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.QUERY_EXECUTE, async (_event, request: QueryRequest) => {
    try {
      const result = await queryExecutor.execute(request)

      // Auto-save successful queries to history
      if (result && !('error' in result)) {
        const qr = result as QueryResult
        addHistoryEntry({
          queryText: request.queryText,
          database: request.database,
          collection: request.collection,
          executionTimeMs: qr.executionTimeMs,
          resultCount: qr.totalCount,
          timestamp: Date.now()
        })
      }

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { error: message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.QUERY_EXPLAIN, async (_event, request: QueryRequest) => {
    try {
      return await queryExecutor.explain(request)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { error: message }
    }
  })
}
