import { Plus } from 'lucide-react'
import { useEditorStore } from '../stores/editor-store'

export default function TabBar(): React.JSX.Element {
  const tabs = useEditorStore((s) => s.tabs)

  return (
    <div className="flex h-9 flex-shrink-0 items-center border-b border-zinc-700 bg-zinc-800/50">
      {tabs.length === 0 ? (
        <div className="flex items-center px-3">
          <span className="text-xs text-zinc-500">No tabs open</span>
        </div>
      ) : (
        <div className="flex items-center overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className="flex items-center gap-1 border-r border-zinc-700 px-3 py-1.5 text-xs hover:bg-zinc-700/50"
            >
              <span className="text-zinc-300">{tab.title}</span>
              {tab.isDirty && <span className="text-blue-400">●</span>}
            </div>
          ))}
        </div>
      )}
      <button className="ml-auto flex items-center px-2 text-zinc-500 hover:text-zinc-300">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
