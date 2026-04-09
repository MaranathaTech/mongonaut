import { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, Copy, Check, Pencil, Trash2 } from 'lucide-react';
import { useDocumentStore } from '../../stores/document-store';
import type { SerializedDocument } from '../../../../shared/types';

interface JsonViewProps {
  data: unknown;
  /** If true, render as a list of documents with headers */
  isDocumentList?: boolean;
  database?: string;
  collection?: string;
}

export default function JsonView({
  data,
  isDocumentList,
  database,
  collection
}: JsonViewProps): React.JSX.Element {
  if (isDocumentList && Array.isArray(data)) {
    return (
      <div className="h-full overflow-auto p-2">
        {data.map((doc, i) => (
          <DocumentItem key={i} doc={doc} index={i} database={database} collection={collection} />
        ))}
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-2 font-mono text-sm">
      <JsonNode value={data} depth={0} expanded />
    </div>
  );
}

function DocumentItem({
  doc,
  index,
  database,
  collection
}: {
  doc: unknown;
  index: number;
  database?: string;
  collection?: string;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const openDocument = useDocumentStore((s) => s.openDocument);
  const openInsert = useDocumentStore((s) => s.openInsert);
  const setConfirmDialog = useDocumentStore((s) => s.setConfirmDialog);

  const idValue =
    doc && typeof doc === 'object' && '_id' in doc
      ? formatIdValue((doc as Record<string, unknown>)._id)
      : `#${index}`;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [doc]);

  const handleEdit = useCallback(() => {
    if (!database || !collection) return;
    openDocument(doc as SerializedDocument, database, collection);
  }, [doc, database, collection, openDocument]);

  const handleClone = useCallback(() => {
    if (!database || !collection) return;
    const cloned = { ...(doc as SerializedDocument) };
    delete cloned._id;
    openInsert(cloned, database, collection);
  }, [doc, database, collection, openInsert]);

  const handleDelete = useCallback(() => {
    if (!database || !collection) return;
    const d = doc as SerializedDocument;
    useDocumentStore.setState({
      originalDocument: d,
      editedDocument: d,
      database,
      collection
    });
    setConfirmDialog({
      type: 'delete',
      onConfirm: async () => {
        const idVal = d._id;
        const serializedId = JSON.stringify(idVal);
        const result = (await window.api.deleteDocument(database, collection, serializedId)) as {
          success: boolean;
          cancelled?: boolean;
        };
        if (result.cancelled) {
          useDocumentStore.getState().setConfirmDialog(null);
          return;
        }
        if (result.success) {
          useDocumentStore.getState().setConfirmDialog(null);
          useDocumentStore.setState({
            originalDocument: null,
            editedDocument: null
          });
        }
      },
      onCancel: () => {
        useDocumentStore.getState().setConfirmDialog(null);
        useDocumentStore.setState({
          originalDocument: null,
          editedDocument: null
        });
      }
    });
  }, [doc, database, collection, setConfirmDialog]);

  const showActions = database && collection;

  return (
    <div className="mb-1 rounded border border-gray-200 dark:border-zinc-700/50">
      <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 dark:bg-zinc-800/50">
        <button
          className="text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
        <span className="text-xs text-gray-400 dark:text-zinc-500">{idValue}</span>

        {/* Action buttons */}
        {showActions && (
          <div className="ml-auto flex items-center gap-0.5">
            <button
              className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
              onClick={handleEdit}
              title="Edit document"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
              onClick={handleClone}
              title="Clone document"
            >
              <Copy className="h-3 w-3" />
            </button>
            <button
              className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
              onClick={handleDelete}
              title="Delete document"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}

        {!showActions && (
          <button
            className="ml-auto text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            onClick={handleCopy}
            title="Copy document"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
      {expanded && (
        <div className="px-2 py-1 font-mono text-sm">
          <JsonNode value={doc} depth={0} expanded />
        </div>
      )}
    </div>
  );
}

function formatIdValue(id: unknown): string {
  if (id && typeof id === 'object' && '$oid' in (id as Record<string, unknown>)) {
    return String((id as Record<string, unknown>).$oid);
  }
  return String(id);
}

interface JsonNodeProps {
  value: unknown;
  depth: number;
  expanded?: boolean;
  keyName?: string;
}

function JsonNode({
  value,
  depth,
  expanded: initialExpanded,
  keyName
}: JsonNodeProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(initialExpanded ?? depth < 2);

  if (value === null) {
    return (
      <span>
        {keyName !== undefined && <KeyLabel name={keyName} />}
        <span className="text-gray-400 dark:text-zinc-500">null</span>
      </span>
    );
  }

  if (value === undefined) {
    return (
      <span>
        {keyName !== undefined && <KeyLabel name={keyName} />}
        <span className="text-gray-400 dark:text-zinc-500">undefined</span>
      </span>
    );
  }

  if (typeof value === 'string') {
    return (
      <span>
        {keyName !== undefined && <KeyLabel name={keyName} />}
        <span className="text-orange-600 dark:text-orange-400">&quot;{value}&quot;</span>
      </span>
    );
  }

  if (typeof value === 'number') {
    return (
      <span>
        {keyName !== undefined && <KeyLabel name={keyName} />}
        <span className="text-green-600 dark:text-green-400">{value}</span>
      </span>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <span>
        {keyName !== undefined && <KeyLabel name={keyName} />}
        <span className="text-blue-600 dark:text-blue-400">{String(value)}</span>
      </span>
    );
  }

  // Extended JSON types
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;

    // ObjectId
    if ('$oid' in obj && Object.keys(obj).length === 1) {
      return (
        <span>
          {keyName !== undefined && <KeyLabel name={keyName} />}
          <span className="text-teal-600 dark:text-teal-400">
            ObjectId(&quot;{String(obj.$oid)}&quot;)
          </span>
        </span>
      );
    }

    // Date
    if ('$date' in obj && Object.keys(obj).length === 1) {
      const dateStr = typeof obj.$date === 'string' ? obj.$date : String(obj.$date);
      return (
        <span>
          {keyName !== undefined && <KeyLabel name={keyName} />}
          <span className="text-purple-600 dark:text-purple-400">
            ISODate(&quot;{dateStr}&quot;)
          </span>
        </span>
      );
    }

    // NumberLong
    if ('$numberLong' in obj && Object.keys(obj).length === 1) {
      return (
        <span>
          {keyName !== undefined && <KeyLabel name={keyName} />}
          <span className="text-green-600 dark:text-green-400">
            NumberLong({String(obj.$numberLong)})
          </span>
        </span>
      );
    }

    // NumberDecimal
    if ('$numberDecimal' in obj && Object.keys(obj).length === 1) {
      return (
        <span>
          {keyName !== undefined && <KeyLabel name={keyName} />}
          <span className="text-green-600 dark:text-green-400">
            NumberDecimal(&quot;{String(obj.$numberDecimal)}&quot;)
          </span>
        </span>
      );
    }

    // Regex
    if ('$regex' in obj) {
      return (
        <span>
          {keyName !== undefined && <KeyLabel name={keyName} />}
          <span className="text-yellow-600 dark:text-yellow-400">
            /{String(obj.$regex)}/{String(obj.$options || '')}
          </span>
        </span>
      );
    }
  }

  // Array
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <span>
          {keyName !== undefined && <KeyLabel name={keyName} />}
          <span className="text-gray-500 dark:text-zinc-400">[]</span>
        </span>
      );
    }

    return (
      <div style={{ paddingLeft: depth > 0 ? 16 : 0 }}>
        <span
          className="cursor-pointer text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          onClick={() => setExpanded(!expanded)}
        >
          {keyName !== undefined && <KeyLabel name={keyName} />}
          {expanded ? (
            <ChevronDown className="mr-1 inline h-3 w-3" />
          ) : (
            <ChevronRight className="mr-1 inline h-3 w-3" />
          )}
          <span className="text-gray-400 dark:text-zinc-500">[</span>
          {!expanded && (
            <span className="text-gray-400 dark:text-zinc-500"> {value.length} items ]</span>
          )}
        </span>
        {expanded && (
          <>
            {value.map((item, i) => (
              <div key={i} className="pl-4">
                <JsonNode value={item} depth={depth + 1} keyName={String(i)} />
                {i < value.length - 1 && (
                  <span className="text-gray-300 dark:text-zinc-600">,</span>
                )}
              </div>
            ))}
            <span className="text-gray-400 dark:text-zinc-500">]</span>
          </>
        )}
      </div>
    );
  }

  // Object
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return (
        <span>
          {keyName !== undefined && <KeyLabel name={keyName} />}
          <span className="text-gray-500 dark:text-zinc-400">{'{}'}</span>
        </span>
      );
    }

    return (
      <div style={{ paddingLeft: depth > 0 ? 16 : 0 }}>
        <span
          className="cursor-pointer text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          onClick={() => setExpanded(!expanded)}
        >
          {keyName !== undefined && <KeyLabel name={keyName} />}
          {expanded ? (
            <ChevronDown className="mr-1 inline h-3 w-3" />
          ) : (
            <ChevronRight className="mr-1 inline h-3 w-3" />
          )}
          <span className="text-gray-400 dark:text-zinc-500">{'{'}</span>
          {!expanded && (
            <span className="text-gray-400 dark:text-zinc-500">
              {' '}
              {entries.length} fields {'}'}
            </span>
          )}
        </span>
        {expanded && (
          <>
            {entries.map(([k, v], i) => (
              <div key={k} className="pl-4">
                <JsonNode value={v} depth={depth + 1} keyName={k} />
                {i < entries.length - 1 && (
                  <span className="text-gray-300 dark:text-zinc-600">,</span>
                )}
              </div>
            ))}
            <span className="text-gray-400 dark:text-zinc-500">{'}'}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <span>
      {keyName !== undefined && <KeyLabel name={keyName} />}
      <span className="text-gray-700 dark:text-zinc-300">{String(value)}</span>
    </span>
  );
}

function KeyLabel({ name }: { name: string }): React.JSX.Element {
  return (
    <>
      <span className="text-sky-600 dark:text-sky-300">&quot;{name}&quot;</span>
      <span className="text-gray-400 dark:text-zinc-500">: </span>
    </>
  );
}
