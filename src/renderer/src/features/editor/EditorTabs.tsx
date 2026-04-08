import { useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import clsx from 'clsx';
import { useEditorStore } from '../../stores/editor-store';

export default function EditorTabs(): React.JSX.Element {
  const tabs = useEditorStore((s) => s.tabs);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const removeTab = useEditorStore((s) => s.removeTab);
  const addTab = useEditorStore((s) => s.addTab);

  const handleClose = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const tab = tabs.find((t) => t.id === id);
      if (tab?.isDirty) {
        if (!window.confirm('This tab has unsaved changes. Close anyway?')) return;
      }
      removeTab(id);
    },
    [tabs, removeTab]
  );

  const handleNewTab = useCallback(() => {
    addTab({
      id: `tab-${Date.now()}`,
      title: 'Untitled',
      database: '',
      collection: '',
      queryText: '',
      isDirty: false
    });
  }, [addTab]);

  return (
    <div className="flex h-9 flex-shrink-0 items-center border-b border-gray-200 bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800/50">
      {tabs.length === 0 ? (
        <div className="flex items-center px-3">
          <span className="text-xs text-gray-400 dark:text-zinc-500">No tabs open</span>
        </div>
      ) : (
        <div className="flex items-center overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'group flex items-center gap-1 border-r border-gray-200 px-3 py-1.5 text-xs dark:border-zinc-700',
                tab.id === activeTabId
                  ? 'bg-white text-gray-900 dark:bg-zinc-900 dark:text-zinc-100'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-400 dark:hover:bg-zinc-700/50 dark:hover:text-zinc-300'
              )}
            >
              <span className="max-w-[120px] truncate">{tab.title}</span>
              {tab.database && (
                <span className="text-[10px] text-gray-400 dark:text-zinc-600">{tab.database}</span>
              )}
              {tab.isDirty && <span className="text-blue-400">&#9679;</span>}
              <span
                onClick={(e) => handleClose(e, tab.id)}
                className="ml-1 rounded p-0.5 opacity-0 hover:bg-gray-300 group-hover:opacity-100 dark:hover:bg-zinc-600"
              >
                <X className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
      )}
      <button
        onClick={handleNewTab}
        className="ml-auto flex items-center px-2 text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300"
        title="New query tab"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
