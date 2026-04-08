import { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, Plus, X, GripVertical } from 'lucide-react';
import type { SerializedDocument } from '../../../../shared/types';

interface TreeEditorProps {
  document: SerializedDocument;
  onChange: (doc: SerializedDocument) => void;
  originalDocument?: SerializedDocument | null;
}

type FieldType = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';

function detectType(value: unknown): FieldType {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'string';
}

function getDefaultForType(type: FieldType): unknown {
  switch (type) {
    case 'string':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'null':
      return null;
    case 'object':
      return {};
    case 'array':
      return [];
  }
}

function typeBadgeColor(type: FieldType): string {
  switch (type) {
    case 'string':
      return 'bg-orange-900/40 text-orange-400';
    case 'number':
      return 'bg-green-900/40 text-green-400';
    case 'boolean':
      return 'bg-blue-900/40 text-blue-400';
    case 'null':
      return 'bg-gray-200/40 dark:bg-zinc-700/40 text-gray-500 dark:text-zinc-400';
    case 'object':
      return 'bg-purple-900/40 text-purple-400';
    case 'array':
      return 'bg-teal-900/40 text-teal-400';
  }
}

function isBsonType(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length === 1) {
    if ('$oid' in obj) return 'ObjectId';
    if ('$date' in obj) return 'Date';
    if ('$numberLong' in obj) return 'Long';
    if ('$numberDecimal' in obj) return 'Decimal';
  }
  if ('$regex' in obj) return 'Regex';
  return null;
}

function setAtPath(obj: unknown, pathParts: (string | number)[], value: unknown): unknown {
  if (pathParts.length === 0) return value;

  const [head, ...rest] = pathParts;

  if (Array.isArray(obj)) {
    const arr = [...obj];
    arr[head as number] = setAtPath(arr[head as number], rest, value);
    return arr;
  }

  if (typeof obj === 'object' && obj !== null) {
    return {
      ...(obj as Record<string, unknown>),
      [head]: setAtPath((obj as Record<string, unknown>)[head as string], rest, value)
    };
  }

  return obj;
}

function deleteAtPath(obj: unknown, pathParts: (string | number)[]): unknown {
  if (pathParts.length === 0) return undefined;

  if (pathParts.length === 1) {
    if (Array.isArray(obj)) {
      const arr = [...obj];
      arr.splice(pathParts[0] as number, 1);
      return arr;
    }
    if (typeof obj === 'object' && obj !== null) {
      const copy = { ...(obj as Record<string, unknown>) };
      delete copy[pathParts[0] as string];
      return copy;
    }
    return obj;
  }

  const [head, ...rest] = pathParts;

  if (Array.isArray(obj)) {
    const arr = [...obj];
    arr[head as number] = deleteAtPath(arr[head as number], rest);
    return arr;
  }

  if (typeof obj === 'object' && obj !== null) {
    return {
      ...(obj as Record<string, unknown>),
      [head]: deleteAtPath((obj as Record<string, unknown>)[head as string], rest)
    };
  }

  return obj;
}

function addFieldAtPath(
  obj: unknown,
  pathParts: (string | number)[],
  key: string,
  value: unknown
): unknown {
  if (pathParts.length === 0) {
    if (Array.isArray(obj)) {
      return [...obj, value];
    }
    if (typeof obj === 'object' && obj !== null) {
      return { ...(obj as Record<string, unknown>), [key]: value };
    }
    return obj;
  }

  const [head, ...rest] = pathParts;

  if (Array.isArray(obj)) {
    const arr = [...obj];
    arr[head as number] = addFieldAtPath(arr[head as number], rest, key, value);
    return arr;
  }

  if (typeof obj === 'object' && obj !== null) {
    return {
      ...(obj as Record<string, unknown>),
      [head]: addFieldAtPath((obj as Record<string, unknown>)[head as string], rest, key, value)
    };
  }

  return obj;
}

export default function TreeEditor({
  document,
  onChange,
  originalDocument
}: TreeEditorProps): React.JSX.Element {
  const handleUpdate = useCallback(
    (path: (string | number)[], value: unknown) => {
      const updated = setAtPath(document, path, value) as SerializedDocument;
      onChange(updated);
    },
    [document, onChange]
  );

  const handleDelete = useCallback(
    (path: (string | number)[]) => {
      const updated = deleteAtPath(document, path) as SerializedDocument;
      onChange(updated);
    },
    [document, onChange]
  );

  const handleAddField = useCallback(
    (parentPath: (string | number)[], key: string, value: unknown) => {
      const updated = addFieldAtPath(document, parentPath, key, value) as SerializedDocument;
      onChange(updated);
    },
    [document, onChange]
  );

  return (
    <div className="h-full overflow-auto p-3 font-mono text-sm">
      <ObjectFields
        obj={document}
        path={[]}
        depth={0}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onAddField={handleAddField}
        originalObj={originalDocument ?? undefined}
      />
    </div>
  );
}

interface ObjectFieldsProps {
  obj: Record<string, unknown>;
  path: (string | number)[];
  depth: number;
  onUpdate: (path: (string | number)[], value: unknown) => void;
  onDelete: (path: (string | number)[]) => void;
  onAddField: (parentPath: (string | number)[], key: string, value: unknown) => void;
  originalObj?: Record<string, unknown>;
}

function ObjectFields({
  obj,
  path,
  depth,
  onUpdate,
  onDelete,
  onAddField,
  originalObj
}: ObjectFieldsProps): React.JSX.Element {
  const [addingField, setAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');

  const handleAddField = (): void => {
    if (!newFieldName.trim()) return;
    if (newFieldName in obj) return;
    onAddField(path, newFieldName.trim(), '');
    setNewFieldName('');
    setAddingField(false);
  };

  return (
    <div>
      {Object.entries(obj).map(([key, value]) => {
        const isIdField = key === '_id' && path.length === 0;
        const fieldPath = [...path, key];
        const origValue = originalObj?.[key];
        const isChanged =
          originalObj !== undefined &&
          key in (originalObj as Record<string, unknown>) &&
          JSON.stringify(origValue) !== JSON.stringify(value);
        const isNew =
          originalObj !== undefined && !(key in (originalObj as Record<string, unknown>));

        return (
          <FieldNode
            key={key}
            fieldKey={key}
            value={value}
            path={fieldPath}
            depth={depth}
            readOnly={isIdField}
            isChanged={isChanged}
            isNew={isNew}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onAddField={onAddField}
          />
        );
      })}

      {/* Add field button */}
      <div className="mt-1" style={{ paddingLeft: depth > 0 ? 20 : 0 }}>
        {addingField ? (
          <div className="flex items-center gap-1">
            <input
              className="rounded border border-gray-300 dark:border-zinc-600 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-xs text-gray-800 dark:text-zinc-200 outline-none focus:border-blue-500"
              placeholder="Field name"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddField();
                if (e.key === 'Escape') {
                  setAddingField(false);
                  setNewFieldName('');
                }
              }}
              autoFocus
            />
            <button
              className="rounded px-1.5 py-0.5 text-xs text-green-400 hover:bg-gray-200 dark:hover:bg-zinc-700"
              onClick={handleAddField}
            >
              Add
            </button>
            <button
              className="rounded px-1.5 py-0.5 text-xs text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700"
              onClick={() => {
                setAddingField(false);
                setNewFieldName('');
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            className="flex items-center gap-1 text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300"
            onClick={() => setAddingField(true)}
          >
            <Plus className="h-3 w-3" />
            Add field
          </button>
        )}
      </div>
    </div>
  );
}

interface FieldNodeProps {
  fieldKey: string;
  value: unknown;
  path: (string | number)[];
  depth: number;
  readOnly?: boolean;
  isChanged?: boolean;
  isNew?: boolean;
  onUpdate: (path: (string | number)[], value: unknown) => void;
  onDelete: (path: (string | number)[]) => void;
  onAddField: (parentPath: (string | number)[], key: string, value: unknown) => void;
}

function FieldNode({
  fieldKey,
  value,
  path,
  depth,
  readOnly,
  isChanged,
  isNew,
  onUpdate,
  onDelete,
  onAddField
}: FieldNodeProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(depth < 2);
  const type = detectType(value);
  const bsonType = isBsonType(value);
  const isExpandable = type === 'object' || type === 'array';

  const changeIndicator = isNew
    ? 'border-l-2 border-green-500'
    : isChanged
      ? 'border-l-2 border-yellow-500'
      : '';

  return (
    <div className={`${changeIndicator}`} style={{ paddingLeft: depth > 0 ? 20 : 0 }}>
      <div className="group flex items-center gap-1 py-0.5 hover:bg-gray-100 dark:hover:bg-zinc-800/50 rounded px-1">
        {/* Expand/collapse for objects and arrays */}
        {isExpandable ? (
          <button
            className="text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 shrink-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <GripVertical className="h-3.5 w-3.5 text-gray-300 dark:text-zinc-700 shrink-0" />
        )}

        {/* Field name */}
        <span className="text-sky-300 shrink-0">{fieldKey}</span>

        {/* Type badge */}
        <span
          className={`rounded px-1 py-0 text-[10px] leading-4 shrink-0 ${typeBadgeColor(bsonType ? 'string' : type)}`}
        >
          {bsonType || type}
        </span>

        {/* Value editor */}
        {!isExpandable && (
          <div className="flex-1 min-w-0 ml-1">
            <ValueEditor
              value={value}
              type={type}
              bsonType={bsonType}
              readOnly={readOnly}
              onChange={(v) => onUpdate(path, v)}
            />
          </div>
        )}

        {isExpandable && !expanded && (
          <span className="text-xs text-gray-400 dark:text-zinc-500 ml-1">
            {type === 'array'
              ? `[${(value as unknown[]).length} items]`
              : `{${Object.keys(value as Record<string, unknown>).length} fields}`}
          </span>
        )}

        {/* Type changer */}
        {!readOnly && !bsonType && (
          <TypeChanger
            currentType={type}
            onChange={(newType) => onUpdate(path, getDefaultForType(newType))}
          />
        )}

        {/* Delete button */}
        {!readOnly && (
          <button
            className="opacity-0 group-hover:opacity-100 text-gray-400 dark:text-zinc-500 hover:text-red-400 shrink-0"
            onClick={() => onDelete(path)}
            title="Remove field"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Expanded children */}
      {isExpandable && expanded && (
        <div>
          {type === 'object' && (
            <ObjectFields
              obj={value as Record<string, unknown>}
              path={path}
              depth={depth + 1}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddField={onAddField}
            />
          )}
          {type === 'array' && (
            <ArrayItems
              arr={value as unknown[]}
              path={path}
              depth={depth + 1}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddField={onAddField}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface ArrayItemsProps {
  arr: unknown[];
  path: (string | number)[];
  depth: number;
  onUpdate: (path: (string | number)[], value: unknown) => void;
  onDelete: (path: (string | number)[]) => void;
  onAddField: (parentPath: (string | number)[], key: string, value: unknown) => void;
}

function ArrayItems({
  arr,
  path,
  depth,
  onUpdate,
  onDelete,
  onAddField
}: ArrayItemsProps): React.JSX.Element {
  return (
    <div>
      {arr.map((item, i) => (
        <FieldNode
          key={i}
          fieldKey={String(i)}
          value={item}
          path={[...path, i]}
          depth={depth}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onAddField={onAddField}
        />
      ))}
      <div style={{ paddingLeft: depth > 0 ? 20 : 0 }} className="mt-1">
        <button
          className="flex items-center gap-1 text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300"
          onClick={() => onAddField(path, String(arr.length), '')}
        >
          <Plus className="h-3 w-3" />
          Add item
        </button>
      </div>
    </div>
  );
}

interface ValueEditorProps {
  value: unknown;
  type: FieldType;
  bsonType: string | null;
  readOnly?: boolean;
  onChange: (value: unknown) => void;
}

function ValueEditor({
  value,
  type,
  bsonType,
  readOnly,
  onChange
}: ValueEditorProps): React.JSX.Element {
  // BSON types shown as read-only text
  if (bsonType) {
    const display = formatBsonDisplay(value as Record<string, unknown>, bsonType);
    return <span className="text-xs text-teal-400">{display}</span>;
  }

  if (readOnly) {
    return (
      <span className="text-xs text-gray-700 dark:text-zinc-300">{formatPrimitive(value)}</span>
    );
  }

  switch (type) {
    case 'string':
      return (
        <input
          className="w-full rounded border border-transparent bg-transparent px-1 py-0 text-xs text-orange-400 outline-none hover:border-gray-300 dark:hover:border-zinc-600 focus:border-blue-500 focus:bg-gray-100 dark:focus:bg-zinc-800"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'number':
      return (
        <input
          className="w-full rounded border border-transparent bg-transparent px-1 py-0 text-xs text-green-400 outline-none hover:border-gray-300 dark:hover:border-zinc-600 focus:border-blue-500 focus:bg-gray-100 dark:focus:bg-zinc-800"
          type="number"
          value={value as number}
          onChange={(e) => {
            const num = parseFloat(e.target.value);
            onChange(isNaN(num) ? 0 : num);
          }}
        />
      );
    case 'boolean':
      return (
        <button
          className={`rounded px-2 py-0 text-xs ${
            value ? 'text-blue-400' : 'text-gray-500 dark:text-zinc-400'
          }`}
          onClick={() => onChange(!value)}
        >
          {String(value)}
        </button>
      );
    case 'null':
      return <span className="text-xs text-gray-400 dark:text-zinc-500">null</span>;
    default:
      return <span className="text-xs text-gray-700 dark:text-zinc-300">{String(value)}</span>;
  }
}

function formatBsonDisplay(obj: Record<string, unknown>, bsonType: string): string {
  switch (bsonType) {
    case 'ObjectId':
      return `ObjectId("${obj.$oid}")`;
    case 'Date':
      return `ISODate("${obj.$date}")`;
    case 'Long':
      return `NumberLong(${obj.$numberLong})`;
    case 'Decimal':
      return `NumberDecimal("${obj.$numberDecimal}")`;
    case 'Regex':
      return `/${obj.$regex}/${obj.$options || ''}`;
    default:
      return JSON.stringify(obj);
  }
}

function formatPrimitive(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  return String(value);
}

interface TypeChangerProps {
  currentType: FieldType;
  onChange: (type: FieldType) => void;
}

function TypeChanger({ currentType, onChange }: TypeChangerProps): React.JSX.Element {
  const types: FieldType[] = ['string', 'number', 'boolean', 'null', 'object', 'array'];

  return (
    <select
      className="opacity-0 group-hover:opacity-100 rounded border border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 px-1 py-0 text-[10px] text-gray-500 dark:text-zinc-400 outline-none shrink-0"
      value={currentType}
      onChange={(e) => onChange(e.target.value as FieldType)}
    >
      {types.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
