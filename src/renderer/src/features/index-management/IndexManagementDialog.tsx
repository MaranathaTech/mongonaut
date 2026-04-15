import { useState, useEffect, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { X, Plus, Trash2, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { useIndexStore } from '../../stores/index-store';
import { useSchemaStore } from '../../stores/schema-store';
import type { IndexInfo } from '../../../../shared/types';

interface IndexManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  database: string;
  collection: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatKey(key: Record<string, number | string>): string {
  return Object.entries(key)
    .map(([field, dir]) => `${field}: ${dir}`)
    .join(', ');
}

interface KeyField {
  name: string;
  direction: 1 | -1;
}

export default function IndexManagementDialog({
  open,
  onOpenChange,
  database,
  collection
}: IndexManagementDialogProps): React.JSX.Element {
  const { indexes, isLoading, error, loadIndexes, createIndex, dropIndex, reset } =
    useIndexStore();
  const fieldNames = useSchemaStore((s) => s.getFieldNames(database, collection));

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [keyFields, setKeyFields] = useState<KeyField[]>([{ name: '', direction: 1 }]);
  const [indexOptions, setIndexOptions] = useState({
    name: '',
    unique: false,
    sparse: false,
    ttl: ''
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [pendingDropIndex, setPendingDropIndex] = useState<IndexInfo | null>(null);

  useEffect(() => {
    if (open) {
      loadIndexes(database, collection);
    } else {
      reset();
      setShowCreateForm(false);
      setCreateError(null);
    }
  }, [open, database, collection, loadIndexes, reset]);

  const handleAddField = useCallback(() => {
    setKeyFields((prev) => [...prev, { name: '', direction: 1 }]);
  }, []);

  const handleRemoveField = useCallback((index: number) => {
    setKeyFields((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleFieldChange = useCallback((index: number, field: Partial<KeyField>) => {
    setKeyFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...field } : f)));
  }, []);

  const handleCreate = useCallback(async () => {
    setCreateError(null);

    const validFields = keyFields.filter((f) => f.name.trim() !== '');
    if (validFields.length === 0) {
      setCreateError('At least one key field is required');
      return;
    }

    const keys: Record<string, 1 | -1> = {};
    for (const f of validFields) {
      keys[f.name.trim()] = f.direction;
    }

    const options: Record<string, unknown> = {};
    if (indexOptions.name.trim()) options.name = indexOptions.name.trim();
    if (indexOptions.unique) options.unique = true;
    if (indexOptions.sparse) options.sparse = true;
    if (indexOptions.ttl.trim()) {
      const ttlVal = parseInt(indexOptions.ttl.trim(), 10);
      if (isNaN(ttlVal) || ttlVal < 0) {
        setCreateError('TTL must be a non-negative integer (seconds)');
        return;
      }
      options.expireAfterSeconds = ttlVal;
    }

    try {
      await createIndex({ database, collection, keys, options });
      setShowCreateForm(false);
      setKeyFields([{ name: '', direction: 1 }]);
      setIndexOptions({ name: '', unique: false, sparse: false, ttl: '' });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create index');
    }
  }, [keyFields, indexOptions, database, collection, createIndex]);

  const handleConfirmDrop = useCallback(async () => {
    if (!pendingDropIndex) return;
    try {
      await dropIndex(database, collection, pendingDropIndex.name);
    } catch {
      // error is set on store
    }
    setPendingDropIndex(null);
  }, [pendingDropIndex, database, collection, dropIndex]);

  const inputClass =
    'w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500';

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-[620px] max-h-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-white shadow-xl focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-zinc-700">
              <Dialog.Title className="text-sm font-medium">
                Indexes — {collection}
              </Dialog.Title>
              <Dialog.Close className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto px-5 py-4">
              {error && (
                <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  {error}
                </div>
              )}

              {isLoading && indexes.length === 0 ? (
                <div className="flex items-center gap-2 py-8 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400 dark:text-zinc-500" />
                  <span className="text-xs text-gray-400 dark:text-zinc-500">Loading indexes...</span>
                </div>
              ) : (
                <>
                  {/* Index table */}
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-zinc-700">
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500 dark:text-zinc-400">
                          Name
                        </th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500 dark:text-zinc-400">
                          Key
                        </th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500 dark:text-zinc-400">
                          Properties
                        </th>
                        <th className="px-2 py-1.5 text-right font-medium text-gray-500 dark:text-zinc-400">
                          Size
                        </th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {indexes.map((idx) => (
                        <tr
                          key={idx.name}
                          className="border-b border-gray-100 dark:border-zinc-800"
                        >
                          <td className="px-2 py-1.5 font-mono text-gray-700 dark:text-zinc-300">
                            {idx.name}
                          </td>
                          <td className="px-2 py-1.5 font-mono text-gray-500 dark:text-zinc-400">
                            {formatKey(idx.key)}
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="flex gap-1 flex-wrap">
                              {idx.unique && (
                                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                  Unique
                                </span>
                              )}
                              {idx.sparse && (
                                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                  Sparse
                                </span>
                              )}
                              {idx.expireAfterSeconds !== undefined && (
                                <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                  TTL: {idx.expireAfterSeconds}s
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-right text-gray-500 dark:text-zinc-400">
                            {formatBytes(idx.size)}
                          </td>
                          <td className="px-1 py-1.5">
                            {!idx.isDefault && (
                              <button
                                onClick={() => setPendingDropIndex(idx)}
                                className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-red-400"
                                title="Drop index"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {indexes.length === 0 && !isLoading && (
                    <p className="py-4 text-center text-xs text-gray-400 dark:text-zinc-500">
                      No indexes found
                    </p>
                  )}
                </>
              )}

              {/* Create index form toggle */}
              <div className="mt-4">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {showCreateForm ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                  Create Index
                </button>

                {showCreateForm && (
                  <div className="mt-3 rounded border border-gray-200 p-3 dark:border-zinc-700">
                    {createError && (
                      <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">
                        {createError}
                      </div>
                    )}

                    {/* Key fields */}
                    <div className="mb-3">
                      <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-zinc-400">
                        Index Keys
                      </label>
                      {keyFields.map((field, i) => (
                        <div key={i} className="mb-1.5 flex items-center gap-2">
                          <div className="flex-1">
                            <input
                              className={inputClass}
                              placeholder="Field name"
                              value={field.name}
                              onChange={(e) => handleFieldChange(i, { name: e.target.value })}
                              list="schema-fields"
                            />
                          </div>
                          <select
                            className={`${inputClass} w-20`}
                            value={field.direction}
                            onChange={(e) =>
                              handleFieldChange(i, {
                                direction: parseInt(e.target.value, 10) as 1 | -1
                              })
                            }
                          >
                            <option value={1}>1 (Asc)</option>
                            <option value={-1}>-1 (Desc)</option>
                          </select>
                          {keyFields.length > 1 && (
                            <button
                              onClick={() => handleRemoveField(i)}
                              className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                      <datalist id="schema-fields">
                        {fieldNames.map((name) => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                      <button
                        onClick={handleAddField}
                        className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Plus className="h-3 w-3" />
                        Add field
                      </button>
                    </div>

                    {/* Options */}
                    <div className="mb-3 grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-gray-500 dark:text-zinc-400">
                          Custom Name (optional)
                        </label>
                        <input
                          className={inputClass}
                          placeholder="Auto-generated if empty"
                          value={indexOptions.name}
                          onChange={(e) =>
                            setIndexOptions((o) => ({ ...o, name: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500 dark:text-zinc-400">
                          TTL (seconds, optional)
                        </label>
                        <input
                          className={inputClass}
                          placeholder="e.g. 3600"
                          value={indexOptions.ttl}
                          onChange={(e) =>
                            setIndexOptions((o) => ({ ...o, ttl: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className="mb-4 flex gap-4">
                      <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-zinc-300">
                        <input
                          type="checkbox"
                          checked={indexOptions.unique}
                          onChange={(e) =>
                            setIndexOptions((o) => ({ ...o, unique: e.target.checked }))
                          }
                          className="rounded"
                        />
                        Unique
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-zinc-300">
                        <input
                          type="checkbox"
                          checked={indexOptions.sparse}
                          onChange={(e) =>
                            setIndexOptions((o) => ({ ...o, sparse: e.target.checked }))
                          }
                          className="rounded"
                        />
                        Sparse
                      </label>
                    </div>

                    <button
                      onClick={handleCreate}
                      disabled={isLoading}
                      className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isLoading ? 'Creating...' : 'Create Index'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Drop confirmation dialog */}
      <AlertDialog.Root
        open={pendingDropIndex !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDropIndex(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <AlertDialog.Title className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
              Drop Index
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
              Are you sure you want to drop index{' '}
              <span className="font-mono font-medium text-gray-700 dark:text-zinc-200">
                {pendingDropIndex?.name}
              </span>
              ? This action cannot be undone.
            </AlertDialog.Description>
            <div className="mt-6 flex justify-end gap-3">
              <AlertDialog.Cancel asChild>
                <button className="rounded px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
                  Cancel
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
                  onClick={handleConfirmDrop}
                >
                  Drop Index
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
