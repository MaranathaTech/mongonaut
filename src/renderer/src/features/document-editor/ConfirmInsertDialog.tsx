import * as AlertDialog from '@radix-ui/react-alert-dialog'
import type { SerializedDocument } from '../../../../shared/types'

interface ConfirmInsertDialogProps {
  open: boolean
  document: SerializedDocument
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmInsertDialog({
  open,
  document,
  onConfirm,
  onCancel
}: ConfirmInsertDialogProps): React.JSX.Element {
  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-xl">
          <AlertDialog.Title className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
            Insert Document
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
            Review the new document before inserting.
          </AlertDialog.Description>

          <div className="mt-4 max-h-80 overflow-auto rounded border border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 p-3">
            <pre className="font-mono text-xs text-gray-700 dark:text-zinc-300 whitespace-pre-wrap break-all">
              {JSON.stringify(document, null, 2)}
            </pre>
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
                Insert
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
