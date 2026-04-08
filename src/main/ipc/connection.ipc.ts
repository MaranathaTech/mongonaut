import { ipcMain } from 'electron'
import Store from 'electron-store'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type { ConnectionConfig } from '../../shared/types'
import { connectionManager } from '../services/connection-manager'

// electron-store v10+ is ESM-only; the Conf base class types don't resolve
// under tsconfig's "node" moduleResolution, so we type the instance manually.
const store = new Store({
  defaults: {
    connections: [] as ConnectionConfig[]
  }
}) as unknown as {
  get(key: 'connections'): ConnectionConfig[]
  set(key: 'connections', value: ConnectionConfig[]): void
}

export function registerConnectionHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.CONNECTION_CONNECT, async (_event, config: ConnectionConfig) => {
    try {
      await connectionManager.connect(config)
      // Update lastUsed timestamp in saved connections
      const connections = store.get('connections') as ConnectionConfig[]
      const idx = connections.findIndex((c) => c.id === config.id)
      if (idx !== -1) {
        connections[idx].lastUsed = Date.now()
        store.set('connections', connections)
      }
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.CONNECTION_DISCONNECT, async () => {
    await connectionManager.disconnect()
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.CONNECTION_TEST, async (_event, config: ConnectionConfig) => {
    return connectionManager.testConnection(config)
  })

  ipcMain.handle(IPC_CHANNELS.CONNECTION_SAVE, (_event, config: ConnectionConfig) => {
    const connections = store.get('connections') as ConnectionConfig[]
    const idx = connections.findIndex((c) => c.id === config.id)
    if (idx !== -1) {
      connections[idx] = config
    } else {
      connections.push(config)
    }
    store.set('connections', connections)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.CONNECTION_LIST, () => {
    return store.get('connections') as ConnectionConfig[]
  })

  ipcMain.handle(IPC_CHANNELS.CONNECTION_DELETE, (_event, id: string) => {
    const connections = store.get('connections') as ConnectionConfig[]
    store.set(
      'connections',
      connections.filter((c) => c.id !== id)
    )
    return { success: true }
  })
}
