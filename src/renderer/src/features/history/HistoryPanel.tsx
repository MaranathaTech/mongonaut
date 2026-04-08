import { useState, useEffect, useCallback, useRef } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as Tooltip from '@radix-ui/react-tooltip';
import { ChevronDown, ChevronRight, Trash2, Search, ExternalLink, Copy, X } from 'lucide-react';
import { useHistoryStore } from '../../stores/history-store';
import { useEditorStore } from '../../stores/editor-store';
import type { QueryHistoryEntry } from '../../../../shared/types';

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function truncateQuery(text: string, maxLen = 60): string {
  const singleLine = text.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= maxLen) return singleLine;
  return singleLine.slice(0, maxLen) + '\u2026';
}

interface HistoryPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export default function HistoryPanel({
  isExpanded,
  onToggle
}: HistoryPanelProps): React.JSX.Element {
  const entries = useHistoryStore((s) => s.filteredEntries);
  const searchQuery = useHistoryStore((s) => s.searchQuery);
  const loadHistory = useHistoryStore((s) => s.loadHistory);
  const searchHistory = useHistoryStore((s) => s.searchHistory);
  const clearHistory = useHistoryStore((s) => s.clearHistory);
  const deleteEntry = useHistoryStore((s) => s.deleteEntry);
  const setSearchQuery = useHistoryStore((s) => s.setSearchQuery);

  const addTab = useEditorStore((s) => s.addTab);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const updateTabQuery = useEditorStore((s) => s.updateTabQuery);

  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isExpanded) {
      loadHistory();
    }
  }, [isExpanded, loadHistory]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        searchHistory(value);
      }, 300);
    },
    [setSearchQuery, searchHistory]
  );

  const loadIntoEditor = useCallback(
    (entry: QueryHistoryEntry) => {
      if (activeTabId) {
        updateTabQuery(activeTabId, entry.queryText);
      } else {
        addTab({
          id: crypto.randomUUID(),
          title: `${entry.collection} query`,
          database: entry.database,
          collection: entry.collection,
          queryText: entry.queryText,
          isDirty: false
        });
      }
    },
    [activeTabId, updateTabQuery, addTab]
  );

  const openInNewTab = useCallback(
    (entry: QueryHistoryEntry) => {
      addTab({
        id: crypto.randomUUID(),
        title: `${entry.collection} query`,
        database: entry.database,
        collection: entry.collection,
        queryText: entry.queryText,
        isDirty: false
      });
    },
    [addTab]
  );

  const copyQuery = useCallback((entry: QueryHistoryEntry) => {
    navigator.clipboard.writeText(entry.queryText);
  }, []);

  const handleClear = async (): Promise<void> => {
    await clearHistory();
    setClearDialogOpen(false);
  };

  return (
    <div className="flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <button
          onClick={onToggle}
          className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          Query History
        </button>
        {isExpanded && entries.length > 0 && (
          <AlertDialog.Root open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
            <AlertDialog.Trigger asChild>
              <button
                className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                title="Clear all history"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </AlertDialog.Trigger>
            <AlertDialog.Portal>
              <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
              <AlertDialog.Content className="fixed left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
                <AlertDialog.Title className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                  Clear all query history?
                </AlertDialog.Title>
                <AlertDialog.Description className="mt-2 text-xs text-gray-500 dark:text-zinc-400">
                  This will permanently delete all saved query history entries. This action cannot
                  be undone.
                </AlertDialog.Description>
                <div className="mt-4 flex justify-end gap-2">
                  <AlertDialog.Cancel className="rounded px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-700">
                    Cancel
                  </AlertDialog.Cancel>
                  <AlertDialog.Action
                    onClick={handleClear}
                    className="rounded bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700"
                  >
                    Clear All
                  </AlertDialog.Action>
                </div>
              </AlertDialog.Content>
            </AlertDialog.Portal>
          </AlertDialog.Root>
        )}
      </div>

      {isExpanded && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Search bar */}
          <div className="px-3 pb-2">
            <div className="flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800">
              <Search className="h-3 w-3 text-gray-400 dark:text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search history\u2026"
                className="flex-1 bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-400 dark:text-zinc-300 dark:placeholder:text-zinc-600"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* History list */}
          <div className="flex-1 overflow-y-auto">
            {entries.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400 dark:text-zinc-600">
                {searchQuery ? 'No matching queries' : 'No queries executed yet'}
              </p>
            ) : (
              entries.map((entry) => (
                <HistoryEntryItem
                  key={entry.id}
                  entry={entry}
                  onClick={() => loadIntoEditor(entry)}
                  onOpenInNewTab={() => openInNewTab(entry)}
                  onCopyQuery={() => copyQuery(entry)}
                  onDelete={() => deleteEntry(entry.id)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryEntryItem({
  entry,
  onClick,
  onOpenInNewTab,
  onCopyQuery,
  onDelete
}: {
  entry: QueryHistoryEntry;
  onClick: () => void;
  onOpenInNewTab: () => void;
  onCopyQuery: () => void;
  onDelete: () => void;
}): React.JSX.Element {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <Tooltip.Provider delayDuration={500}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                onClick={onClick}
                className="w-full border-b border-gray-100 px-3 py-1.5 text-left hover:bg-gray-100 dark:border-zinc-800 dark:hover:bg-zinc-800/60"
              >
                <p className="truncate font-mono text-xs text-gray-700 dark:text-zinc-300">
                  {truncateQuery(entry.queryText)}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-gray-400 dark:text-zinc-500">
                  <span>
                    {entry.database}.{entry.collection}
                  </span>
                  <span>&middot;</span>
                  <span>{formatRelativeTime(entry.timestamp)}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-gray-300 dark:text-zinc-600">
                  <span>{entry.executionTimeMs}ms</span>
                  <span>&middot;</span>
                  <span>{formatNumber(entry.resultCount)} docs</span>
                </div>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                side="right"
                className="max-w-xs rounded border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
              >
                <pre className="whitespace-pre-wrap font-mono text-xs text-gray-700 dark:text-zinc-300">
                  {entry.queryText}
                </pre>
                <Tooltip.Arrow className="fill-gray-200 dark:fill-zinc-700" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-[160px] rounded-md border border-gray-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          <ContextMenu.Item
            className="flex cursor-default items-center gap-2 rounded px-2 py-1.5 text-xs text-gray-700 outline-none hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
            onSelect={onOpenInNewTab}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in new tab
          </ContextMenu.Item>
          <ContextMenu.Item
            className="flex cursor-default items-center gap-2 rounded px-2 py-1.5 text-xs text-gray-700 outline-none hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
            onSelect={onCopyQuery}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy query
          </ContextMenu.Item>
          <ContextMenu.Separator className="my-1 h-px bg-gray-200 dark:bg-zinc-700" />
          <ContextMenu.Item
            className="flex cursor-default items-center gap-2 rounded px-2 py-1.5 text-xs text-red-500 outline-none hover:bg-gray-100 dark:text-red-400 dark:hover:bg-zinc-700"
            onSelect={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
