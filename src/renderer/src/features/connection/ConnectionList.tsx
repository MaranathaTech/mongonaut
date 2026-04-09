import { useState } from 'react';
import { Plus, Trash2, Plug, Server } from 'lucide-react';
import type { StoredConnectionConfig } from '../../../../shared/types';
import { useConnectionStore } from '../../stores/connection-store';

interface ConnectionListProps {
  connections: StoredConnectionConfig[];
  onNewConnection: () => void;
  onEditConnection: (config: StoredConnectionConfig) => void;
  onDeleteConnection: (id: string) => void;
}

export default function ConnectionList({
  connections,
  onNewConnection,
  onEditConnection,
  onDeleteConnection
}: ConnectionListProps): React.JSX.Element {
  const connect = useConnectionStore((s) => s.connect);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async (config: StoredConnectionConfig): Promise<void> => {
    setConnectingId(config.id);
    setError(null);
    try {
      const result = await window.api.connect(config);
      if (result.success) {
        connect(config);
      } else {
        setError(result.error || 'Connection failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setConnectingId(null);
    }
  };

  const displayHost = (config: StoredConnectionConfig): string => {
    if (config.mode === 'uri') {
      return config.host || 'URI connection';
    }
    return `${config.host || 'localhost'}:${config.port || 27017}`;
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto p-2">
        {connections.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <Plug className="h-8 w-8 text-gray-300 dark:text-zinc-600" />
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">
                No saved connections
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">
                Create a new connection to get started
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {connections.map((config) => (
              <div
                key={config.id}
                className="group flex items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <button
                  className="flex flex-1 items-center gap-2 text-left"
                  onClick={() => handleConnect(config)}
                  disabled={connectingId === config.id}
                >
                  <Server className="h-3.5 w-3.5 flex-shrink-0 text-gray-400 dark:text-zinc-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-800 dark:text-zinc-200">
                      {config.name}
                    </p>
                    <p className="truncate text-xs text-gray-400 dark:text-zinc-500">
                      {displayHost(config)}
                    </p>
                  </div>
                </button>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditConnection(config);
                    }}
                    className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                    title="Edit"
                  >
                    <Plug className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConnection(config.id);
                    }}
                    className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mx-2 mt-2 rounded bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 p-2 dark:border-zinc-700">
        <button
          onClick={onNewConnection}
          className="flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:border-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        >
          <Plus className="h-3.5 w-3.5" />
          New Connection
        </button>
      </div>
    </div>
  );
}
