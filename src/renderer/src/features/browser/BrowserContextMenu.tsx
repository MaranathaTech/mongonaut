import * as ContextMenu from '@radix-ui/react-context-menu';
import { RefreshCw, Table2, BarChart3 } from 'lucide-react';

interface DatabaseContextMenuProps {
  children: React.ReactNode;
  onRefreshCollections: () => void;
}

export function DatabaseContextMenu({
  children,
  onRefreshCollections
}: DatabaseContextMenuProps): React.JSX.Element {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-[160px] rounded-md border border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 p-1 shadow-lg">
          <ContextMenu.Item
            className="flex cursor-default items-center gap-2 rounded px-2 py-1.5 text-xs text-gray-700 dark:text-zinc-300 outline-none hover:bg-gray-200 dark:hover:bg-zinc-700"
            onSelect={onRefreshCollections}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Collections
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

interface CollectionContextMenuProps {
  children: React.ReactNode;
  onOpenQueryTab: () => void;
  onViewStats: () => void;
  onRefresh: () => void;
}

export function CollectionContextMenu({
  children,
  onOpenQueryTab,
  onViewStats,
  onRefresh
}: CollectionContextMenuProps): React.JSX.Element {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-[160px] rounded-md border border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 p-1 shadow-lg">
          <ContextMenu.Item
            className="flex cursor-default items-center gap-2 rounded px-2 py-1.5 text-xs text-gray-700 dark:text-zinc-300 outline-none hover:bg-gray-200 dark:hover:bg-zinc-700"
            onSelect={onOpenQueryTab}
          >
            <Table2 className="h-3.5 w-3.5" />
            Open Query Tab
          </ContextMenu.Item>
          <ContextMenu.Item
            className="flex cursor-default items-center gap-2 rounded px-2 py-1.5 text-xs text-gray-700 dark:text-zinc-300 outline-none hover:bg-gray-200 dark:hover:bg-zinc-700"
            onSelect={onViewStats}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            View Stats
          </ContextMenu.Item>
          <ContextMenu.Separator className="my-1 h-px bg-gray-200 dark:bg-zinc-700" />
          <ContextMenu.Item
            className="flex cursor-default items-center gap-2 rounded px-2 py-1.5 text-xs text-gray-700 dark:text-zinc-300 outline-none hover:bg-gray-200 dark:hover:bg-zinc-700"
            onSelect={onRefresh}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
