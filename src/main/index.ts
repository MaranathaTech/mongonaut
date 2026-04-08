import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import { registerConnectionHandlers } from './ipc/connection.ipc'
import { registerDatabaseHandlers } from './ipc/database.ipc'
import { registerSchemaHandlers } from './ipc/schema.ipc'
import { registerQueryHandlers } from './ipc/query.ipc'
import { registerDocumentHandlers } from './ipc/document.ipc'
import { registerHistoryHandlers } from './ipc/history.ipc'

interface WindowBounds {
  x?: number
  y?: number
  width: number
  height: number
}

const windowStore = new Store({ name: 'window-state' }) as unknown as {
  get(key: 'bounds'): WindowBounds | undefined
  get(key: 'bounds', defaultValue: WindowBounds): WindowBounds
  get(key: 'isMaximized'): boolean | undefined
  get(key: 'isMaximized', defaultValue: boolean): boolean
  set(key: 'bounds', value: WindowBounds): void
  set(key: 'isMaximized', value: boolean): void
}

function createWindow(): void {
  const defaults: WindowBounds = { width: 1400, height: 900 }
  const bounds = windowStore.get('bounds', defaults)
  const isMaximized = windowStore.get('isMaximized', false)

  const mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#18181b',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (isMaximized) {
    mainWindow.maximize()
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Save window state on close
  mainWindow.on('close', () => {
    windowStore.set('isMaximized', mainWindow.isMaximized())
    if (!mainWindow.isMaximized()) {
      windowStore.set('bounds', mainWindow.getBounds())
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.mongo-viewer')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerConnectionHandlers()
  registerDatabaseHandlers()
  registerSchemaHandlers()
  registerQueryHandlers()
  registerDocumentHandlers()
  registerHistoryHandlers()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
