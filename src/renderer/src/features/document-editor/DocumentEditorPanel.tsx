import { useCallback } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { useDocumentStore } from '../../stores/document-store';
import { useResultsStore } from '../../stores/results-store';
import TreeEditor from './TreeEditor';
import JsonDocumentEditor from './JsonDocumentEditor';
import ConfirmDeleteDialog from './ConfirmDeleteDialog';
import ConfirmUpdateDialog from './ConfirmUpdateDialog';
import ConfirmInsertDialog from './ConfirmInsertDialog';
import ConfirmDiscardDialog from './ConfirmDiscardDialog';

export default function DocumentEditorPanel(): React.JSX.Element | null {
  const isOpen = useDocumentStore((s) => s.isOpen);
  const action = useDocumentStore((s) => s.action);
  const editorMode = useDocumentStore((s) => s.editorMode);
  const originalDocument = useDocumentStore((s) => s.originalDocument);
  const editedDocument = useDocumentStore((s) => s.editedDocument);
  const isDirty = useDocumentStore((s) => s.isDirty);
  const confirmDialog = useDocumentStore((s) => s.confirmDialog);

  const setEditedDocument = useDocumentStore((s) => s.setEditedDocument);
  const setEditorMode = useDocumentStore((s) => s.setEditorMode);
  const resetToOriginal = useDocumentStore((s) => s.resetToOriginal);
  const tryClose = useDocumentStore((s) => s.tryClose);
  const requestSave = useDocumentStore((s) => s.requestSave);
  const requestDelete = useDocumentStore((s) => s.requestDelete);
  const requestInsert = useDocumentStore((s) => s.requestInsert);

  const refreshResults = useRefreshResults();

  const handleConfirm = useCallback(async () => {
    if (confirmDialog) {
      await confirmDialog.onConfirm();
      refreshResults();
    }
  }, [confirmDialog, refreshResults]);

  const handleCancel = useCallback(() => {
    confirmDialog?.onCancel();
  }, [confirmDialog]);

  if (!isOpen || !editedDocument) return null;

  const isInsert = action === 'insert';
  const title = isInsert ? 'Insert Document' : 'Edit Document';

  return (
    <>
      {/* Slide-over panel */}
      <div className="fixed inset-0 z-40 flex justify-end">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40" onClick={tryClose} />

        {/* Panel */}
        <div className="relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-700 px-4 py-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                {title}
              </span>
              {isDirty && (
                <span className="rounded bg-yellow-900/40 px-1.5 py-0.5 text-[10px] text-yellow-400">
                  Modified
                </span>
              )}
            </div>
            <button
              className="text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200"
              onClick={tryClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mode tabs */}
          <div className="flex border-b border-gray-200 dark:border-zinc-700">
            <button
              className={`px-4 py-1.5 text-xs font-medium ${
                editorMode === 'tree'
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'
              }`}
              onClick={() => setEditorMode('tree')}
            >
              Tree
            </button>
            <button
              className={`px-4 py-1.5 text-xs font-medium ${
                editorMode === 'json'
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'
              }`}
              onClick={() => setEditorMode('json')}
            >
              JSON
            </button>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            {editorMode === 'tree' && (
              <TreeEditor
                document={editedDocument}
                onChange={setEditedDocument}
                originalDocument={originalDocument}
              />
            )}
            {editorMode === 'json' && (
              <JsonDocumentEditor
                key={JSON.stringify(editedDocument)}
                document={editedDocument}
                onChange={setEditedDocument}
                onReset={resetToOriginal}
              />
            )}
          </div>

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between border-t border-gray-200 dark:border-zinc-700 px-4 py-2">
            <div className="flex items-center gap-2">
              {!isInsert && (
                <button
                  className="flex items-center gap-1 rounded px-3 py-1.5 text-xs text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-700 dark:hover:text-zinc-200"
                  onClick={resetToOriginal}
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              )}
              {!isInsert && (
                <button
                  className="rounded px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/20 hover:text-red-300"
                  onClick={requestDelete}
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded px-3 py-1.5 text-xs text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-700 dark:hover:text-zinc-200"
                onClick={tryClose}
              >
                Cancel
              </button>
              {isInsert ? (
                <button
                  className="rounded bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                  onClick={requestInsert}
                >
                  Insert
                </button>
              ) : (
                <button
                  className="rounded bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-40"
                  onClick={requestSave}
                  disabled={!isDirty}
                >
                  Save Changes
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation dialogs */}
      {confirmDialog?.type === 'delete' && originalDocument && (
        <ConfirmDeleteDialog
          open
          document={originalDocument}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
      {confirmDialog?.type === 'update' && originalDocument && editedDocument && (
        <ConfirmUpdateDialog
          open
          originalDocument={originalDocument}
          editedDocument={editedDocument}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
      {confirmDialog?.type === 'insert' && editedDocument && (
        <ConfirmInsertDialog
          open
          document={editedDocument}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
      {confirmDialog?.type === 'discard' && (
        <ConfirmDiscardDialog open onConfirm={handleConfirm} onCancel={handleCancel} />
      )}
    </>
  );
}

function useRefreshResults(): () => void {
  const lastQuery = useResultsStore((s) => s.lastQuery);
  const executeQuery = useResultsStore((s) => s.executeQuery);

  return useCallback(() => {
    if (lastQuery) {
      executeQuery(lastQuery.database, lastQuery.collection, lastQuery.queryText);
    }
  }, [lastQuery, executeQuery]);
}
