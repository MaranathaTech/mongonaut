import { useCallback } from 'react'
import { Loader2, X, Table, Braces, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useResultsStore } from '../../stores/results-store'
import { useDocumentStore } from '../../stores/document-store'
import TableView from './TableView'
import JsonView from './JsonView'
import DocumentEditorPanel from '../document-editor/DocumentEditorPanel'
import ConfirmDeleteDialog from '../document-editor/ConfirmDeleteDialog'

function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (Array.isArray(value)) {
      result[fullKey] = JSON.stringify(value)
    } else if (value !== null && typeof value === 'object') {
      // Handle EJSON types
      const v = value as Record<string, unknown>
      if ('$oid' in v) {
        result[fullKey] = String(v.$oid)
      } else if ('$date' in v) {
        result[fullKey] = String(v.$date)
      } else if ('$numberLong' in v) {
        result[fullKey] = String(v.$numberLong)
      } else if ('$numberDecimal' in v) {
        result[fullKey] = String(v.$numberDecimal)
      } else {
        Object.assign(result, flattenObject(v, fullKey))
      }
    } else {
      result[fullKey] = value
    }
  }
  return result
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function exportJson(documents: Record<string, unknown>[]): void {
  const json = JSON.stringify(documents, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `export-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function exportCsv(documents: Record<string, unknown>[]): void {
  if (documents.length === 0) return

  // Flatten all documents and collect headers
  const flattened = documents.map((doc) => flattenObject(doc))
  const headerSet = new Set<string>()
  for (const doc of flattened) {
    for (const key of Object.keys(doc)) {
      headerSet.add(key)
    }
  }
  const headers = Array.from(headerSet)

  const lines: string[] = []
  lines.push(headers.map(escapeCsvValue).join(','))
  for (const doc of flattened) {
    const row = headers.map((h) => escapeCsvValue(doc[h]))
    lines.push(row.join(','))
  }

  const csv = lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `export-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ResultsPanel(): React.JSX.Element {
  const results = useResultsStore((s) => s.results)
  const explainResult = useResultsStore((s) => s.explainResult)
  const isLoading = useResultsStore((s) => s.isLoading)
  const error = useResultsStore((s) => s.error)
  const viewMode = useResultsStore((s) => s.viewMode)
  const page = useResultsStore((s) => s.page)
  const pageSize = useResultsStore((s) => s.pageSize)
  const lastQuery = useResultsStore((s) => s.lastQuery)
  const setViewMode = useResultsStore((s) => s.setViewMode)
  const goToPage = useResultsStore((s) => s.goToPage)
  const changePageSize = useResultsStore((s) => s.changePageSize)
  const clearError = useResultsStore((s) => s.clearError)

  // Document editor state for inline delete confirmation (triggered from table/json action buttons)
  const confirmDialog = useDocumentStore((s) => s.confirmDialog)
  const originalDocument = useDocumentStore((s) => s.originalDocument)
  const isEditorOpen = useDocumentStore((s) => s.isOpen)

  const executeQuery = useResultsStore((s) => s.executeQuery)

  const refreshResults = useCallback(() => {
    if (lastQuery) {
      executeQuery(lastQuery.database, lastQuery.collection, lastQuery.queryText)
    }
  }, [lastQuery, executeQuery])

  const handleConfirmDelete = useCallback(async () => {
    if (confirmDialog) {
      await confirmDialog.onConfirm()
      refreshResults()
    }
  }, [confirmDialog, refreshResults])

  const handleCancelDelete = useCallback(() => {
    confirmDialog?.onCancel()
  }, [confirmDialog])

  const hasResults = results !== null || explainResult !== null
  const totalCount = results?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const executionTimeMs = results?.executionTimeMs ?? 0

  const startRow = hasResults ? (page - 1) * pageSize + 1 : 0
  const endRow = hasResults ? Math.min(page * pageSize, totalCount) : 0

  const database = lastQuery?.database ?? ''
  const collection = lastQuery?.collection ?? ''

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
        goToPage(newPage)
      }
    },
    [totalPages, goToPage]
  )

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      changePageSize(newSize)
    },
    [changePageSize]
  )

  // Empty state
  if (!hasResults && !isLoading && !error) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400 dark:text-zinc-500">
        <p className="text-sm">Execute a query to see results</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-1 dark:border-zinc-700 dark:bg-zinc-800/30">
        {/* View mode toggle */}
        <div className="flex rounded border border-gray-300 dark:border-zinc-600">
          <button
            className={`flex items-center gap-1 px-2 py-0.5 text-xs ${
              viewMode === 'table'
                ? 'bg-gray-200 text-gray-900 dark:bg-zinc-600 dark:text-zinc-100'
                : 'text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
            onClick={() => setViewMode('table')}
          >
            <Table className="h-3 w-3" />
            Table
          </button>
          <button
            className={`flex items-center gap-1 px-2 py-0.5 text-xs ${
              viewMode === 'json'
                ? 'bg-gray-200 text-gray-900 dark:bg-zinc-600 dark:text-zinc-100'
                : 'text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
            onClick={() => setViewMode('json')}
          >
            <Braces className="h-3 w-3" />
            JSON
          </button>
        </div>

        {/* Execution stats */}
        {results && (
          <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-zinc-500">
            <span>{totalCount.toLocaleString()} documents</span>
            <span>{executionTimeMs}ms</span>
          </div>
        )}

        {explainResult !== null && !results && (
          <span className="text-xs text-gray-400 dark:text-zinc-500">Explain result</span>
        )}

        {isLoading && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400 dark:text-zinc-400" />
        )}

        {/* Export buttons */}
        {results && results.documents.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => exportJson(results.documents)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
              title="Export as JSON"
            >
              <Download className="h-3 w-3" />
              JSON
            </button>
            <button
              onClick={() => exportCsv(results.documents)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
              title="Export as CSV"
            >
              <Download className="h-3 w-3" />
              CSV
            </button>
          </div>
        )}

        {/* Pagination - right side */}
        {results && totalCount > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <select
              className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs text-gray-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            >
              {[10, 25, 50, 100, 500].map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>

            <span className="text-xs text-gray-400 dark:text-zinc-500">
              {startRow}-{endRow} of {totalCount.toLocaleString()}
            </span>

            <div className="flex">
              <button
                className="rounded-l border border-gray-300 px-1.5 py-0.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                className="rounded-r border border-l-0 border-gray-300 px-1.5 py-0.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 border-b border-red-200 bg-red-50 px-3 py-2 dark:border-red-800/50 dark:bg-red-900/20">
          <span className="flex-1 text-xs text-red-600 dark:text-red-400">{error}</span>
          <button className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" onClick={clearError}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading && !hasResults && (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-zinc-400" />
          </div>
        )}

        {explainResult !== null && viewMode === 'json' && (
          <JsonView data={explainResult} />
        )}

        {results && viewMode === 'table' && (
          <TableView documents={results.documents} database={database} collection={collection} />
        )}

        {results && viewMode === 'json' && explainResult === null && (
          <JsonView data={results.documents} isDocumentList database={database} collection={collection} />
        )}
      </div>

      {/* Document editor slide-over */}
      {isEditorOpen && <DocumentEditorPanel />}

      {/* Standalone delete confirmation (when triggered from action buttons without opening editor) */}
      {!isEditorOpen && confirmDialog?.type === 'delete' && originalDocument && (
        <ConfirmDeleteDialog
          open
          document={originalDocument}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </div>
  )
}
