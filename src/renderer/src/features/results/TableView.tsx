import { useMemo, useCallback, useRef } from 'react';
import { Pencil, Copy, Trash2 } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import {
  ModuleRegistry,
  ClientSideRowModelModule,
  ColumnAutoSizeModule,
  TextFilterModule,
  TextEditorModule,
  themeQuartz,
  type ColDef,
  type GridReadyEvent,
  type ValueFormatterParams,
  type CellValueChangedEvent,
  type ICellRendererParams
} from 'ag-grid-community';
import type { SerializedDocument } from '../../../../shared/types';
import { useDocumentStore } from '../../stores/document-store';
import { useThemeStore } from '../../stores/theme-store';

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  ColumnAutoSizeModule,
  TextFilterModule,
  TextEditorModule
]);

const darkTheme = themeQuartz.withParams({
  accentColor: '#3b82f6',
  backgroundColor: '#18181b',
  foregroundColor: '#e4e4e7',
  headerBackgroundColor: '#27272a',
  headerTextColor: '#a1a1aa',
  borderColor: '#3f3f46',
  selectedRowBackgroundColor: 'rgba(59, 130, 246, 0.15)',
  rowHoverColor: 'rgba(255, 255, 255, 0.04)',
  spacing: 6,
  fontSize: 13,
  headerFontSize: 12
});

const lightTheme = themeQuartz.withParams({
  accentColor: '#3b82f6',
  backgroundColor: '#ffffff',
  foregroundColor: '#1f2937',
  headerBackgroundColor: '#f9fafb',
  headerTextColor: '#6b7280',
  borderColor: '#e5e7eb',
  selectedRowBackgroundColor: 'rgba(59, 130, 246, 0.1)',
  rowHoverColor: 'rgba(0, 0, 0, 0.02)',
  spacing: 6,
  fontSize: 13,
  headerFontSize: 12
});

function formatCellValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return '';
  if (typeof value === 'object') {
    // Handle Extended JSON representations
    if (value !== null && '$oid' in (value as Record<string, unknown>)) {
      return String((value as Record<string, unknown>).$oid);
    }
    if (value !== null && '$date' in (value as Record<string, unknown>)) {
      const d = (value as Record<string, unknown>).$date;
      if (typeof d === 'string') {
        try {
          return new Date(d).toLocaleString();
        } catch {
          return String(d);
        }
      }
      return String(d);
    }
    if (Array.isArray(value)) {
      return `Array(${value.length})`;
    }
    return JSON.stringify(value);
  }
  return String(value);
}

function isEditableValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const type = typeof value;
  return type === 'string' || type === 'number' || type === 'boolean';
}

interface TableViewProps {
  documents: SerializedDocument[];
  database: string;
  collection: string;
}

function ActionsRenderer(params: ICellRendererParams): React.JSX.Element {
  const doc = params.data as SerializedDocument;
  const openDocument = useDocumentStore((s) => s.openDocument);
  const openInsert = useDocumentStore((s) => s.openInsert);
  const setConfirmDialog = useDocumentStore((s) => s.setConfirmDialog);
  const database = (params.context as { database: string }).database;
  const collection = (params.context as { collection: string }).collection;

  return (
    <div className="flex items-center gap-0.5 h-full">
      <button
        className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
        title="Edit document"
        onClick={(e) => {
          e.stopPropagation();
          openDocument(doc, database, collection);
        }}
      >
        <Pencil className="h-3 w-3" />
      </button>
      <button
        className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
        title="Clone document"
        onClick={(e) => {
          e.stopPropagation();
          const cloned = { ...doc };
          delete cloned._id;
          openInsert(cloned, database, collection);
        }}
      >
        <Copy className="h-3 w-3" />
      </button>
      <button
        className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
        title="Delete document"
        onClick={(e) => {
          e.stopPropagation();
          // Open the document first so delete knows what to delete
          useDocumentStore.setState({
            originalDocument: doc,
            editedDocument: doc,
            database,
            collection
          });
          // Directly set up delete confirmation
          setConfirmDialog({
            type: 'delete',
            onConfirm: async () => {
              const idValue = doc._id;
              const serializedId = JSON.stringify(idValue);
              const result = (await window.api.deleteDocument(
                database,
                collection,
                serializedId
              )) as { success: boolean; cancelled?: boolean; error?: string };
              if (result.cancelled) {
                useDocumentStore.getState().setConfirmDialog(null);
                return result;
              }
              if (result.success) {
                useDocumentStore.getState().setConfirmDialog(null);
                useDocumentStore.getState().closeEditor();
              }
              return result;
            },
            onCancel: () => {
              useDocumentStore.getState().setConfirmDialog(null);
              useDocumentStore.setState({
                originalDocument: null,
                editedDocument: null
              });
            }
          });
        }}
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

export default function TableView({
  documents,
  database,
  collection
}: TableViewProps): React.JSX.Element {
  const gridRef = useRef<AgGridReact>(null);
  const openDocument = useDocumentStore((s) => s.openDocument);
  const theme = useThemeStore((s) => s.theme);
  const agTheme = theme === 'dark' ? darkTheme : lightTheme;

  const columnDefs = useMemo<ColDef[]>(() => {
    if (documents.length === 0) return [];

    // Collect all unique keys across all documents
    const keySet = new Set<string>();
    for (const doc of documents) {
      for (const key of Object.keys(doc)) {
        keySet.add(key);
      }
    }

    const keys = Array.from(keySet);

    // Ensure _id is always first
    const idIndex = keys.indexOf('_id');
    if (idIndex > 0) {
      keys.splice(idIndex, 1);
      keys.unshift('_id');
    }

    const dataCols: ColDef[] = keys.map((key) => ({
      field: key,
      headerName: key,
      minWidth: key === '_id' ? 120 : 100,
      flex: key === '_id' ? 0 : 1,
      width: key === '_id' ? 220 : undefined,
      resizable: true,
      sortable: true,
      editable: (params) => {
        if (key === '_id') return false;
        return isEditableValue(params.data[key]);
      },
      valueFormatter: (params: ValueFormatterParams) => formatCellValue(params.value),
      valueSetter: (params) => {
        const newValue = params.newValue;
        const field = params.colDef.field;
        if (!field) return false;

        // Parse the edited value back to the appropriate type
        const oldValue = params.data[field];
        let parsed: unknown = newValue;

        if (typeof oldValue === 'number') {
          parsed = parseFloat(newValue);
          if (isNaN(parsed as number)) return false;
        } else if (typeof oldValue === 'boolean') {
          parsed = newValue === 'true' || newValue === true;
        } else if (oldValue === null && newValue === 'null') {
          parsed = null;
        }

        params.data[field] = parsed;
        return true;
      }
    }));

    // Actions column
    const actionsCol: ColDef = {
      headerName: '',
      field: '__actions',
      width: 90,
      minWidth: 90,
      maxWidth: 90,
      resizable: false,
      sortable: false,
      pinned: 'right',
      cellRenderer: ActionsRenderer,
      cellStyle: { padding: '0 4px' }
    };

    return [...dataCols, actionsCol];
  }, [documents]);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: true,
      minWidth: 80
    }),
    []
  );

  const onGridReady = useCallback((params: GridReadyEvent) => {
    // Auto-size columns on first render
    params.api.autoSizeAllColumns();
  }, []);

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent) => {
      const doc = event.data as SerializedDocument;
      // Open the document editor with the modified doc and trigger save confirmation
      openDocument(doc, database, collection);
      // Immediately mark as dirty and request save
      useDocumentStore.getState().requestSave();
    },
    [openDocument, database, collection]
  );

  const context = useMemo(() => ({ database, collection }), [database, collection]);

  return (
    <div className="h-full w-full">
      <AgGridReact
        ref={gridRef}
        theme={agTheme}
        rowData={documents}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        onGridReady={onGridReady}
        onCellValueChanged={onCellValueChanged}
        context={context}
        suppressCellFocus={false}
        animateRows={false}
        headerHeight={32}
        rowHeight={30}
        stopEditingWhenCellsLoseFocus={true}
      />
    </div>
  );
}
