import { useState, useEffect, useCallback, useRef } from 'react'
import { Database, Unplug } from 'lucide-react'
import { useConnectionStore } from '../stores/connection-store'
import ConnectionList from '../features/connection/ConnectionList'
import ConnectionDialog from '../features/connection/ConnectionDialog'
import DatabaseTree from '../features/browser/DatabaseTree'
import HistoryPanel from '../features/history/HistoryPanel'
import type { ConnectionConfig } from '../../../shared/types'

const MIN_HISTORY_HEIGHT = 32
const MAX_HISTORY_PERCENT = 70

interface SidebarProps {
  connectionDialogTrigger?: number
}

export default function Sidebar({ connectionDialogTrigger }: SidebarProps): React.JSX.Element {
  const isConnected = useConnectionStore((s) => s.isConnected)
  const connectionConfig = useConnectionStore((s) => s.connectionConfig)
  const savedConnections = useConnectionStore((s) => s.savedConnections)
  const loadSavedConnections = useConnectionStore((s) => s.loadSavedConnections)
  const deleteConnection = useConnectionStore((s) => s.deleteConnection)
  const disconnect = useConnectionStore((s) => s.disconnect)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editConfig, setEditConfig] = useState<ConnectionConfig | null>(null)
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [historyHeight, setHistoryHeight] = useState(200)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSavedConnections().then(() => {
      // Auto-open dialog is handled after connections load
    })
  }, [loadSavedConnections])

  // Auto-open dialog if no saved connections on initial load
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  useEffect(() => {
    if (!initialLoadDone && savedConnections !== undefined) {
      setInitialLoadDone(true)
      if (savedConnections.length === 0) {
        setDialogOpen(true)
      }
    }
  }, [savedConnections, initialLoadDone])

  // Open dialog when triggered by keyboard shortcut (Ctrl+L)
  useEffect(() => {
    if (connectionDialogTrigger && connectionDialogTrigger > 0) {
      setEditConfig(null)
      setDialogOpen(true)
    }
  }, [connectionDialogTrigger])

  const handleNewConnection = (): void => {
    setEditConfig(null)
    setDialogOpen(true)
  }

  const handleEditConnection = (config: ConnectionConfig): void => {
    setEditConfig(config)
    setDialogOpen(true)
  }

  const handleDeleteConnection = async (id: string): Promise<void> => {
    await deleteConnection(id)
  }

  const handleDialogOpenChange = (open: boolean): void => {
    setDialogOpen(open)
    if (!open) {
      setEditConfig(null)
      loadSavedConnections()
    }
  }

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!historyExpanded) return
      e.preventDefault()
      setIsResizing(true)
    },
    [historyExpanded]
  )

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent): void => {
      if (!sidebarRef.current) return
      const rect = sidebarRef.current.getBoundingClientRect()
      const newHeight = rect.bottom - e.clientY
      const maxHeight = rect.height * (MAX_HISTORY_PERCENT / 100)
      setHistoryHeight(Math.min(maxHeight, Math.max(MIN_HISTORY_HEIGHT, newHeight)))
    }

    const handleMouseUp = (): void => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  return (
    <div ref={sidebarRef} className="flex h-full flex-col">
      {/* Connection header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium">Mongonaut</span>
        </div>
        {isConnected && (
          <button
            onClick={() => disconnect()}
            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
            title="Disconnect"
          >
            <Unplug className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Connected state indicator */}
      {isConnected && (
        <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-1.5 dark:border-zinc-700">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-xs text-gray-500 dark:text-zinc-400">
            {connectionConfig?.name || 'Connected'}
          </span>
        </div>
      )}

      {/* Database Browser (takes remaining space) */}
      <div className="flex-1 overflow-hidden">
        {isConnected ? (
          <DatabaseTree />
        ) : (
          <ConnectionList
            connections={savedConnections}
            onNewConnection={handleNewConnection}
            onEditConnection={handleEditConnection}
            onDeleteConnection={handleDeleteConnection}
          />
        )}
      </div>

      {/* Resize handle between browser and history */}
      {historyExpanded && (
        <div
          className={`resize-handle resize-handle-vertical ${isResizing ? 'active' : ''}`}
          onMouseDown={handleResizeMouseDown}
        />
      )}

      {/* Query History (bottom, collapsible) */}
      <div
        className="flex flex-shrink-0 flex-col border-t border-gray-200 overflow-hidden dark:border-zinc-700"
        style={{ height: historyExpanded ? historyHeight : 'auto' }}
      >
        <HistoryPanel
          isExpanded={historyExpanded}
          onToggle={() => setHistoryExpanded(!historyExpanded)}
        />
      </div>

      <ConnectionDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        editConfig={editConfig}
      />
    </div>
  )
}
