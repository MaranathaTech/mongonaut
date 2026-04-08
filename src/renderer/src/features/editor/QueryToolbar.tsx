import { Play, Info, Code2, RefreshCw } from 'lucide-react';

interface QueryToolbarProps {
  database: string;
  collection: string;
  limit: number;
  onLimitChange: (limit: number) => void;
  onExecute: () => void;
  onExplain: () => void;
  onFormat: () => void;
  onRefreshSchema: () => void;
  schemaIsLoading: boolean;
}

const LIMIT_OPTIONS = [10, 25, 50, 100, 500];

export default function QueryToolbar({
  database,
  collection,
  limit,
  onLimitChange,
  onExecute,
  onExplain,
  onFormat,
  onRefreshSchema,
  schemaIsLoading
}: QueryToolbarProps): React.JSX.Element {
  return (
    <div className="flex h-9 flex-shrink-0 items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 dark:border-zinc-700 dark:bg-zinc-800/50">
      {/* Run button */}
      <button
        onClick={onExecute}
        className="flex items-center gap-1.5 rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-500 active:bg-blue-700"
      >
        <Play className="h-3 w-3" />
        Run
        <span className="ml-1 text-[10px] text-blue-200">Ctrl+Enter</span>
      </button>

      {/* Explain button */}
      <button
        onClick={onExplain}
        className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
      >
        <Info className="h-3 w-3" />
        Explain
      </button>

      {/* Format button */}
      <button
        onClick={onFormat}
        className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
      >
        <Code2 className="h-3 w-3" />
        Format
      </button>

      <div className="mx-1 h-4 w-px bg-gray-200 dark:bg-zinc-700" />

      {/* Database / Collection info */}
      <div className="flex items-center gap-1 text-xs">
        <span className="text-gray-400 dark:text-zinc-500">{database}</span>
        <span className="text-gray-300 dark:text-zinc-600">.</span>
        <span className="text-gray-700 dark:text-zinc-300">{collection}</span>
      </div>

      {/* Refresh Schema button */}
      <button
        onClick={onRefreshSchema}
        disabled={schemaIsLoading}
        title="Refresh schema (re-sample field names)"
        className="flex items-center rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 disabled:opacity-50 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
      >
        <RefreshCw className={`h-3 w-3 ${schemaIsLoading ? 'animate-spin' : ''}`} />
      </button>

      <div className="flex-1" />

      {/* Limit selector */}
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-gray-400 dark:text-zinc-500">Limit:</span>
        <select
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs text-gray-700 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
          {LIMIT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
