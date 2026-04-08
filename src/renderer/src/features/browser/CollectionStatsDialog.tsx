import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { CollectionStats } from '../../../../shared/types'

interface CollectionStatsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  database: string
  collection: string
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export default function CollectionStatsDialog({
  open,
  onOpenChange,
  database,
  collection
}: CollectionStatsDialogProps): React.JSX.Element {
  const [stats, setStats] = useState<CollectionStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    window.api
      .collectionStats(database, collection)
      .then((result) => {
        setStats(result)
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })
  }, [open, database, collection])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 p-5 shadow-xl focus:outline-none">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
              Collection Stats
            </Dialog.Title>
            <Dialog.Close className="rounded p-1 text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700 hover:text-gray-700 dark:hover:text-zinc-200">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <p className="mb-3 text-xs text-gray-500 dark:text-zinc-400">
            {database}.{collection}
          </p>

          {loading && <p className="text-sm text-gray-400 dark:text-zinc-500">Loading stats...</p>}

          {error && <p className="text-sm text-red-400">{error}</p>}

          {stats && !loading && (
            <div className="space-y-2">
              <StatRow label="Documents" value={stats.count.toLocaleString()} />
              <StatRow label="Total Size" value={formatBytes(stats.size)} />
              <StatRow label="Avg Document Size" value={formatBytes(stats.avgObjSize)} />
              <StatRow label="Storage Size" value={formatBytes(stats.storageSize)} />
              <StatRow label="Indexes" value={stats.indexes.toString()} />
              <StatRow label="Index Size" value={formatBytes(stats.indexSize)} />
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function StatRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between rounded bg-white dark:bg-zinc-900 px-3 py-1.5">
      <span className="text-xs text-gray-500 dark:text-zinc-400">{label}</span>
      <span className="text-xs font-medium text-gray-800 dark:text-zinc-200">{value}</span>
    </div>
  )
}
