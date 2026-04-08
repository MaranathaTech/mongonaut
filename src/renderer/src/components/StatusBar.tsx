import { Circle, Sun, Moon } from 'lucide-react'
import { useConnectionStore } from '../stores/connection-store'
import { useResultsStore } from '../stores/results-store'
import { useThemeStore } from '../stores/theme-store'

export default function StatusBar(): React.JSX.Element {
  const isConnected = useConnectionStore((s) => s.isConnected)
  const config = useConnectionStore((s) => s.connectionConfig)
  const results = useResultsStore((s) => s.results)
  const isLoading = useResultsStore((s) => s.isLoading)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)

  const connectionLabel = (): string => {
    if (!isConnected || !config) return 'Disconnected'
    if (config.mode === 'uri' && config.uri) {
      try {
        const url = new URL(config.uri)
        return `Connected to ${url.host}`
      } catch {
        return 'Connected'
      }
    }
    return `Connected to ${config.host || 'localhost'}:${config.port || 27017}`
  }

  const databaseLabel = config?.database || null

  return (
    <div className="flex h-7 flex-shrink-0 items-center border-t border-gray-200 bg-gray-50 px-3 text-xs text-gray-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-500">
      <div className="flex items-center gap-1.5">
        <Circle
          className={`h-2.5 w-2.5 ${isConnected ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400 dark:fill-zinc-600 dark:text-zinc-600'}`}
        />
        <span>{connectionLabel()}</span>
      </div>
      {databaseLabel && (
        <>
          <div className="mx-3 h-3 w-px bg-gray-200 dark:bg-zinc-700" />
          <span>{databaseLabel}</span>
        </>
      )}
      <div className="mx-3 h-3 w-px bg-gray-200 dark:bg-zinc-700" />
      <span>{isLoading ? 'Executing...' : 'Ready'}</span>
      <div className="ml-auto flex items-center gap-3">
        <span>Rows: {results ? results.totalCount.toLocaleString() : '\u2013'}</span>
        <span>Time: {results ? `${results.executionTimeMs}ms` : '\u2013'}</span>
        <div className="h-3 w-px bg-gray-200 dark:bg-zinc-700" />
        <button
          onClick={toggleTheme}
          className="rounded p-0.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}
