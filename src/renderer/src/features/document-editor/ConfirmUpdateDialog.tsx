import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { diffDocuments, formatValue } from '../../lib/json-diff';
import type { SerializedDocument } from '../../../../shared/types';

interface ConfirmUpdateDialogProps {
  open: boolean;
  originalDocument: SerializedDocument;
  editedDocument: SerializedDocument;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmUpdateDialog({
  open,
  originalDocument,
  editedDocument,
  onConfirm,
  onCancel
}: ConfirmUpdateDialogProps): React.JSX.Element {
  const diffs = diffDocuments(originalDocument, editedDocument);

  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-xl">
          <AlertDialog.Title className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
            Save Changes
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
            Review the changes before saving.
          </AlertDialog.Description>

          <div className="mt-4 max-h-80 overflow-auto rounded border border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 p-3">
            {diffs.length === 0 ? (
              <div className="text-sm text-gray-400 dark:text-zinc-500">No changes detected.</div>
            ) : (
              <div className="space-y-2 font-mono text-xs">
                {diffs.map((diff, i) => (
                  <div
                    key={i}
                    className="rounded border border-gray-200/50 dark:border-zinc-700/50 p-2"
                  >
                    <div className="mb-1 text-gray-500 dark:text-zinc-400">{diff.path}</div>
                    {diff.type === 'added' && (
                      <div className="text-green-400">+ {formatValue(diff.newValue)}</div>
                    )}
                    {diff.type === 'removed' && (
                      <div className="text-red-400">- {formatValue(diff.oldValue)}</div>
                    )}
                    {diff.type === 'changed' && (
                      <>
                        <div className="text-red-400">- {formatValue(diff.oldValue)}</div>
                        <div className="text-green-400">+ {formatValue(diff.newValue)}</div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <button className="rounded px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800">
                Cancel
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
                onClick={onConfirm}
              >
                Save Changes
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
