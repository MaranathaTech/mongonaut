import * as Dialog from '@radix-ui/react-dialog';
import { X, Keyboard } from 'lucide-react';

const shortcuts = [
  { keys: 'Ctrl+Enter', action: 'Execute query' },
  { keys: 'Ctrl+Shift+Enter', action: 'Explain query' },
  { keys: 'Ctrl+Shift+F', action: 'Format query' },
  { keys: 'Ctrl+N', action: 'New query tab' },
  { keys: 'Ctrl+W', action: 'Close current tab' },
  { keys: 'Ctrl+Tab', action: 'Next tab' },
  { keys: 'Ctrl+Shift+Tab', action: 'Previous tab' },
  { keys: 'Ctrl+L', action: 'Focus connection dialog' },
  { keys: 'F5', action: 'Refresh results' },
  { keys: 'Escape', action: 'Close dialog/panel' },
  { keys: '?', action: 'Show keyboard shortcuts' }
];

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function KeyboardShortcutsDialog({
  open,
  onOpenChange
}: KeyboardShortcutsDialogProps): React.JSX.Element {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-white shadow-xl focus:outline-none dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-zinc-700">
            <Dialog.Title className="flex items-center gap-2 text-sm font-medium">
              <Keyboard className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
              Keyboard Shortcuts
            </Dialog.Title>
            <Dialog.Close className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="max-h-[400px] overflow-y-auto px-5 py-3">
            <table className="w-full">
              <tbody>
                {shortcuts.map((s) => (
                  <tr
                    key={s.keys}
                    className="border-b border-gray-100 last:border-0 dark:border-zinc-800"
                  >
                    <td className="py-2 pr-4">
                      <span className="text-xs text-gray-600 dark:text-zinc-300">{s.action}</span>
                    </td>
                    <td className="py-2 text-right">
                      <kbd className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {s.keys}
                      </kbd>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
