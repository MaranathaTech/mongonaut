import { Database, Plug } from 'lucide-react'
import { useConnectionStore } from '../stores/connection-store'

export default function Sidebar(): React.JSX.Element {
  const isConnected = useConnectionStore((s) => s.isConnected)

  return (
    <div className="flex h-full flex-col">
      {/* Connection header */}
      <div className="flex items-center gap-2 border-b border-zinc-700 px-3 py-2">
        <Database className="h-4 w-4 text-blue-400" />
        <span className="text-sm font-medium">MongoViewer</span>
      </div>

      {/* Tree / placeholder */}
      <div className="flex flex-1 items-center justify-center p-4">
        {isConnected ? (
          <p className="text-sm text-zinc-500">Loading databases...</p>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <Plug className="h-8 w-8 text-zinc-600" />
            <div>
              <p className="text-sm font-medium text-zinc-400">No connection</p>
              <p className="mt-1 text-xs text-zinc-500">Connect to a MongoDB server to browse</p>
            </div>
          </div>
        )}
      </div>

      {/* History placeholder */}
      <div className="border-t border-zinc-700 px-3 py-2">
        <p className="text-xs font-medium text-zinc-500">Query History</p>
        <p className="mt-1 text-xs text-zinc-600">No recent queries</p>
      </div>
    </div>
  )
}
