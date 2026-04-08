import { Circle } from 'lucide-react'
import { useConnectionStore } from '../stores/connection-store'

export default function StatusBar(): React.JSX.Element {
  const isConnected = useConnectionStore((s) => s.isConnected)

  return (
    <div className="flex h-7 flex-shrink-0 items-center border-t border-zinc-700 bg-zinc-800/50 px-3 text-xs text-zinc-500">
      <div className="flex items-center gap-1.5">
        <Circle
          className={`h-2.5 w-2.5 ${isConnected ? 'fill-green-500 text-green-500' : 'fill-zinc-600 text-zinc-600'}`}
        />
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
      <div className="mx-3 h-3 w-px bg-zinc-700" />
      <span>Ready</span>
      <div className="ml-auto flex items-center gap-3">
        <span>Rows: –</span>
        <span>Time: –</span>
      </div>
    </div>
  )
}
