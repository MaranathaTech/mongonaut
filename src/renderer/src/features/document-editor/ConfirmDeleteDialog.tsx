import * as AlertDialog from '@radix-ui/react-alert-dialog';
import type { SerializedDocument } from '../../../../shared/types';

interface ConfirmDeleteDialogProps {
  open: boolean;
  document: SerializedDocument;
  onConfirm: () => void;
  onCancel: () => void;
}

function formatIdValue(id: unknown): string {
  if (id && typeof id === 'object' && '$oid' in (id as Record<string, unknown>)) {
    return String((id as Record<string, unknown>).$oid);
  }
  return JSON.stringify(id);
}

export default function ConfirmDeleteDialog({
  open,
  document,
  onConfirm,
  onCancel
}: ConfirmDeleteDialogProps): React.JSX.Element {
  const idDisplay = formatIdValue(document._id);

  // Show a preview of the first few fields
  const previewEntries = Object.entries(document)
    .filter(([key]) => key !== '_id')
    .slice(0, 5);

  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-xl">
          <AlertDialog.Title className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
            Delete Document
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
            Are you sure you want to delete this document? This action cannot be undone.
          </AlertDialog.Description>

          <div className="mt-4 rounded border border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 p-3">
            <div className="mb-2 text-xs text-gray-400 dark:text-zinc-500">Document ID</div>
            <div className="font-mono text-sm text-teal-400 break-all">{idDisplay}</div>

            {previewEntries.length > 0 && (
              <>
                <div className="mt-3 mb-1 text-xs text-gray-400 dark:text-zinc-500">Preview</div>
                <div className="space-y-0.5 font-mono text-xs">
                  {previewEntries.map(([key, value]) => (
                    <div key={key} className="truncate text-gray-500 dark:text-zinc-400">
                      <span className="text-sky-300">{key}</span>
                      <span className="text-gray-400 dark:text-zinc-500">: </span>
                      <span className="text-gray-700 dark:text-zinc-300">
                        {typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}
                      </span>
                    </div>
                  ))}
                  {Object.keys(document).length - 1 > 5 && (
                    <div className="text-gray-300 dark:text-zinc-600">
                      ... {Object.keys(document).length - 1 - 5} more fields
                    </div>
                  )}
                </div>
              </>
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
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
                onClick={onConfirm}
              >
                Delete
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
