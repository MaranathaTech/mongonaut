import { useState, useCallback, useEffect } from 'react';
import { useEditorStore } from '../../stores/editor-store';
import { useSchemaStore } from '../../stores/schema-store';
import { useResultsStore } from '../../stores/results-store';
import EditorTabs from './EditorTabs';
import QueryToolbar from './QueryToolbar';
import QueryEditor from './QueryEditor';

// Import Monaco config to ensure local bundling (must be before Editor renders)
import './monaco-config';

export default function EditorPanel(): React.JSX.Element {
  const tabs = useEditorStore((s) => s.tabs);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const updateTabQuery = useEditorStore((s) => s.updateTabQuery);
  const loadSchema = useSchemaStore((s) => s.loadSchema);
  const invalidateSchema = useSchemaStore((s) => s.invalidate);
  const schemaIsLoading = useSchemaStore((s) => s.isLoading);

  const executeQuery = useResultsStore((s) => s.executeQuery);
  const explainQuery = useResultsStore((s) => s.explainQuery);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const [limit, setLimit] = useState(50);

  // Load schema when the active tab changes to a new database.collection
  useEffect(() => {
    if (activeTab) {
      loadSchema(activeTab.database, activeTab.collection);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on database/collection only, not activeTab reference
  }, [activeTab?.database, activeTab?.collection, loadSchema]);

  const handleRefreshSchema = useCallback(() => {
    if (!activeTab) return;
    invalidateSchema(activeTab.database, activeTab.collection);
    loadSchema(activeTab.database, activeTab.collection);
  }, [activeTab, invalidateSchema, loadSchema]);

  const handleQueryChange = useCallback(
    (value: string) => {
      if (activeTabId) {
        updateTabQuery(activeTabId, value);
      }
    },
    [activeTabId, updateTabQuery]
  );

  const handleExecute = useCallback(() => {
    if (!activeTab) return;
    // Set pageSize directly on the store before executing (avoids double query)
    useResultsStore.setState({ pageSize: limit, page: 1 });
    executeQuery(activeTab.database, activeTab.collection, activeTab.queryText);
  }, [activeTab, limit, executeQuery]);

  const handleExplain = useCallback(() => {
    if (!activeTab) return;
    explainQuery(activeTab.database, activeTab.collection, activeTab.queryText);
  }, [activeTab, explainQuery]);

  const handleFormat = useCallback(() => {
    if (!activeTab) return;
    try {
      const text = activeTab.queryText;
      const formatted = tryFormatQuery(text);
      if (formatted !== text) {
        updateTabQuery(activeTab.id, formatted);
      }
    } catch {
      // If formatting fails, silently ignore
    }
  }, [activeTab, updateTabQuery]);

  return (
    <div className="flex h-full flex-col">
      <EditorTabs />

      {activeTab ? (
        <>
          <QueryToolbar
            database={activeTab.database}
            collection={activeTab.collection}
            limit={limit}
            onLimitChange={setLimit}
            onExecute={handleExecute}
            onExplain={handleExplain}
            onFormat={handleFormat}
            onRefreshSchema={handleRefreshSchema}
            schemaIsLoading={schemaIsLoading}
          />
          <div className="flex-1 overflow-hidden">
            <QueryEditor
              value={activeTab.queryText}
              database={activeTab.database}
              collection={activeTab.collection}
              onChange={handleQueryChange}
              onExecute={handleExecute}
              onFormat={handleFormat}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center text-gray-400 dark:text-zinc-500">
          <p className="text-sm">
            Double-click a collection in the sidebar or press{' '}
            <kbd className="rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-zinc-800 dark:text-zinc-400">
              +
            </kbd>{' '}
            to create a new query tab
          </p>
        </div>
      )}
    </div>
  );
}

/** Try to prettify the JSON-like body of a method call */
function tryFormatMethodBody(prefix: string, body: string, suffix: string): string | null {
  try {
    const normalized = body
      .replace(/'/g, '"')
      .replace(/(\w+)\s*:/g, '"$1":')
      .replace(/,\s*([}\]])/g, '$1');

    const parsed = JSON.parse(normalized);
    const formatted = JSON.stringify(parsed, null, 2);
    return `${prefix}\n${formatted}\n${suffix.trim()}`;
  } catch {
    return null;
  }
}

/** Attempt to format a MongoDB query string by prettifying JSON-like content */
function tryFormatQuery(text: string): string {
  // db.getCollection("name").method(...)
  const getCollMatch = text.match(
    /^(db\.getCollection\s*\(\s*["'][^"']+["']\s*\)\.\w+\s*\()(.+)(\)\s*)$/s
  );
  if (getCollMatch) {
    const result = tryFormatMethodBody(getCollMatch[1], getCollMatch[2], getCollMatch[3]);
    if (result) return result;
  }

  // db["name"].method(...)
  const bracketMatch = text.match(
    /^(db\s*\[\s*["'][^"']+["']\s*\]\.\w+\s*\()(.+)(\)\s*)$/s
  );
  if (bracketMatch) {
    const result = tryFormatMethodBody(bracketMatch[1], bracketMatch[2], bracketMatch[3]);
    if (result) return result;
  }

  // db.collection.method(...)
  const methodMatch = text.match(/^(db\.\w+\.\w+\s*\()(.+)(\)\s*)$/s);
  if (methodMatch) {
    const result = tryFormatMethodBody(methodMatch[1], methodMatch[2], methodMatch[3]);
    if (result) return result;
  }

  return text;
}
