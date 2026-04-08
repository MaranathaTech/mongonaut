import * as AlertDialog from '@radix-ui/react-alert-dialog'

interface ConfirmDiscardDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDiscardDialog({
  open,
  onConfirm,
  onCancel
}: ConfirmDiscardDialogProps): React.JSX.Element {
  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-xl">
          <AlertDialog.Title className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
            Unsaved Changes
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
            You have unsaved changes. Are you sure you want to discard them?
          </AlertDialog.Description>

          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <button className="rounded px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800">
                Keep Editing
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
                onClick={onConfirm}
              >
                Discard Changes
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
