import { useEffect, useCallback, useState, useRef } from 'react';
import { Tree, NodeRendererProps } from 'react-arborist';
import { Database, Table2, ChevronRight, ChevronDown, RefreshCw, Loader2 } from 'lucide-react';
import { useBrowserStore } from '../../stores/browser-store';
import { useEditorStore } from '../../stores/editor-store';
import { DatabaseContextMenu, CollectionContextMenu } from './BrowserContextMenu';
import CollectionStatsDialog from './CollectionStatsDialog';
import IndexManagementDialog from '../index-management/IndexManagementDialog';

interface TreeNode {
  id: string;
  name: string;
  type: 'database' | 'collection';
  database?: string;
  children?: TreeNode[];
}

export default function DatabaseTree(): React.JSX.Element {
  const databases = useBrowserStore((s) => s.databases);
  const collections = useBrowserStore((s) => s.collections);
  const isLoading = useBrowserStore((s) => s.isLoading);
  const loadDatabases = useBrowserStore((s) => s.loadDatabases);
  const loadCollections = useBrowserStore((s) => s.loadCollections);
  const refresh = useBrowserStore((s) => s.refresh);
  const addTab = useEditorStore((s) => s.addTab);

  const [statsDialog, setStatsDialog] = useState<{
    open: boolean;
    database: string;
    collection: string;
  }>({ open: false, database: '', collection: '' });

  const [indexDialog, setIndexDialog] = useState<{
    open: boolean;
    database: string;
    collection: string;
  }>({ open: false, database: '', collection: '' });

  const containerRef = useRef<HTMLDivElement>(null);
  const [treeHeight, setTreeHeight] = useState(400);

  useEffect(() => {
    loadDatabases();
  }, [loadDatabases]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setTreeHeight(entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const treeData: TreeNode[] = databases.map((db) => {
    const dbCollections = collections[db.name];
    return {
      id: `db:${db.name}`,
      name: db.name,
      type: 'database' as const,
      children: dbCollections
        ? dbCollections.map((col) => ({
            id: `col:${db.name}.${col.name}`,
            name: col.name,
            type: 'collection' as const,
            database: db.name
          }))
        : undefined
    };
  });

  const handleToggle = useCallback(
    (id: string) => {
      // When a database node is expanded, load its collections if not already loaded
      const match = id.match(/^db:(.+)$/);
      if (match) {
        const dbName = match[1];
        if (!collections[dbName]) {
          loadCollections(dbName);
        }
      }
    },
    [collections, loadCollections]
  );

  const openQueryTab = useCallback(
    (database: string, collection: string) => {
      const queryText = /^\w+$/.test(collection)
        ? `db.${collection}.find({})`
        : `db.getCollection("${collection}").find({})`;
      addTab({
        id: `tab-${Date.now()}`,
        title: collection,
        database,
        collection,
        queryText,
        isDirty: false
      });
    },
    [addTab]
  );

  const openStats = useCallback((database: string, collection: string) => {
    setStatsDialog({ open: true, database, collection });
  }, []);

  const openIndexes = useCallback((database: string, collection: string) => {
    setIndexDialog({ open: true, database, collection });
  }, []);

  const refreshDatabase = useCallback(
    (database: string) => {
      loadCollections(database);
    },
    [loadCollections]
  );

  if (isLoading && databases.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400 dark:text-zinc-500" />
        <span className="text-xs text-gray-400 dark:text-zinc-500">Loading databases...</span>
      </div>
    );
  }

  if (databases.length === 0) {
    return (
      <div className="p-3">
        <p className="text-xs text-gray-400 dark:text-zinc-500">No databases found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-1.5 dark:border-zinc-700">
        <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">Databases</span>
        <button
          onClick={() => refresh()}
          className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
          title="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div ref={containerRef} className="flex-1 overflow-hidden">
        <Tree<TreeNode>
          data={treeData}
          openByDefault={false}
          width="100%"
          height={treeHeight}
          indent={16}
          rowHeight={28}
          onToggle={handleToggle}
          disableDrag
          disableDrop
        >
          {(props) => (
            <TreeNodeRenderer
              {...props}
              onOpenQueryTab={openQueryTab}
              onViewStats={openStats}
              onManageIndexes={openIndexes}
              onRefreshDatabase={refreshDatabase}
            />
          )}
        </Tree>
      </div>

      <CollectionStatsDialog
        open={statsDialog.open}
        onOpenChange={(open) => setStatsDialog((s) => ({ ...s, open }))}
        database={statsDialog.database}
        collection={statsDialog.collection}
      />

      <IndexManagementDialog
        open={indexDialog.open}
        onOpenChange={(open) => setIndexDialog((s) => ({ ...s, open }))}
        database={indexDialog.database}
        collection={indexDialog.collection}
      />
    </div>
  );
}

interface TreeNodeRendererExtraProps {
  onOpenQueryTab: (database: string, collection: string) => void;
  onViewStats: (database: string, collection: string) => void;
  onManageIndexes: (database: string, collection: string) => void;
  onRefreshDatabase: (database: string) => void;
}

function TreeNodeRenderer({
  node,
  style,
  onOpenQueryTab,
  onViewStats,
  onManageIndexes,
  onRefreshDatabase
}: NodeRendererProps<TreeNode> & TreeNodeRendererExtraProps): React.JSX.Element {
  const data = node.data;
  const isDb = data.type === 'database';
  const dbName = isDb ? data.name : data.database!;
  const selectedCollection = useBrowserStore((s) => s.selectedCollection);
  const selectCollection = useBrowserStore((s) => s.selectCollection);

  const isSelected =
    !isDb &&
    selectedCollection?.database === dbName &&
    selectedCollection?.collection === data.name;

  const handleClick = (): void => {
    if (isDb) {
      node.toggle();
    } else {
      selectCollection(dbName, data.name);
    }
  };

  const handleDoubleClick = (): void => {
    if (!isDb) {
      onOpenQueryTab(dbName, data.name);
    }
  };

  const content = (
    <div
      style={style}
      className={`flex cursor-default items-center gap-1.5 px-1 text-xs ${
        isSelected
          ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300'
          : 'text-gray-700 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-700/50'
      }`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {isDb ? (
        <>
          {node.isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-zinc-500" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-zinc-500" />
          )}
          <Database className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
        </>
      ) : (
        <>
          <span className="w-3.5 shrink-0" />
          <Table2 className="h-3.5 w-3.5 shrink-0 text-blue-400" />
        </>
      )}
      <span className="truncate">{data.name}</span>
    </div>
  );

  if (isDb) {
    return (
      <DatabaseContextMenu onRefreshCollections={() => onRefreshDatabase(dbName)}>
        {content}
      </DatabaseContextMenu>
    );
  }

  return (
    <CollectionContextMenu
      onOpenQueryTab={() => onOpenQueryTab(dbName, data.name)}
      onViewStats={() => onViewStats(dbName, data.name)}
      onManageIndexes={() => onManageIndexes(dbName, data.name)}
      onRefresh={() => onRefreshDatabase(dbName)}
    >
      {content}
    </CollectionContextMenu>
  );
}
