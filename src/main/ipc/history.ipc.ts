import { ipcMain } from 'electron'
import Store from 'electron-store'
import { randomUUID } from 'crypto'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type { QueryHistoryEntry } from '../../shared/types'

const MAX_ENTRIES = 500

// electron-store v10+ is ESM-only; type the instance manually.
const store = new Store({
  name: 'query-history',
  defaults: {
    entries: [] as QueryHistoryEntry[]
  }
}) as unknown as {
  get(key: 'entries'): QueryHistoryEntry[]
  set(key: 'entries', value: QueryHistoryEntry[]): void
}

export function addHistoryEntry(
  entry: Omit<QueryHistoryEntry, 'id'>
): QueryHistoryEntry {
  const newEntry: QueryHistoryEntry = { ...entry, id: randomUUID() }
  const entries = store.get('entries')
  entries.unshift(newEntry)
  if (entries.length > MAX_ENTRIES) {
    entries.splice(MAX_ENTRIES)
  }
  store.set('entries', entries)
  return newEntry
}

export function registerHistoryHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.HISTORY_LIST, () => {
    return store.get('entries')
  })

  ipcMain.handle(IPC_CHANNELS.HISTORY_SEARCH, (_event, query: string) => {
    const entries = store.get('entries')
    const lower = query.toLowerCase()
    return entries.filter(
      (e) =>
        e.queryText.toLowerCase().includes(lower) ||
        e.database.toLowerCase().includes(lower) ||
        e.collection.toLowerCase().includes(lower)
    )
  })

  ipcMain.handle(IPC_CHANNELS.HISTORY_CLEAR, () => {
    store.set('entries', [])
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.HISTORY_DELETE, (_event, id: string) => {
    const entries = store.get('entries').filter((e) => e.id !== id)
    store.set('entries', entries)
    return { success: true }
  })
}
