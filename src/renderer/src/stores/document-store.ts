import { create } from 'zustand';
import type { SerializedDocument } from '../../../shared/types';

export type EditorMode = 'tree' | 'json';
export type DocumentAction = 'edit' | 'insert';

interface ConfirmDialog {
  type: 'update' | 'delete' | 'insert' | 'discard';
  onConfirm: () => void;
  onCancel: () => void;
}

interface DocumentEditorState {
  isOpen: boolean;
  action: DocumentAction;
  editorMode: EditorMode;
  originalDocument: SerializedDocument | null;
  editedDocument: SerializedDocument | null;
  database: string;
  collection: string;
  isDirty: boolean;

  confirmDialog: ConfirmDialog | null;

  // Open/close
  openDocument: (
    doc: SerializedDocument,
    database: string,
    collection: string,
    mode?: EditorMode
  ) => void;
  openInsert: (
    doc: SerializedDocument,
    database: string,
    collection: string,
    mode?: EditorMode
  ) => void;
  closeEditor: () => void;
  tryClose: () => void;

  // Editing
  setEditedDocument: (doc: SerializedDocument) => void;
  setEditorMode: (mode: EditorMode) => void;
  resetToOriginal: () => void;

  // Confirmation flow
  requestSave: () => void;
  requestDelete: () => void;
  requestInsert: () => void;
  setConfirmDialog: (dialog: ConfirmDialog | null) => void;

  // Execute CRUD
  executeSave: () => Promise<{ success: boolean; error?: string }>;
  executeDelete: () => Promise<{ success: boolean; error?: string }>;
  executeInsert: () => Promise<{ success: boolean; error?: string }>;
}

function documentsEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export const useDocumentStore = create<DocumentEditorState>((set, get) => ({
  isOpen: false,
  action: 'edit',
  editorMode: 'tree',
  originalDocument: null,
  editedDocument: null,
  database: '',
  collection: '',
  isDirty: false,
  confirmDialog: null,

  openDocument: (doc, database, collection, mode = 'tree') => {
    set({
      isOpen: true,
      action: 'edit',
      editorMode: mode,
      originalDocument: structuredClone(doc),
      editedDocument: structuredClone(doc),
      database,
      collection,
      isDirty: false,
      confirmDialog: null
    });
  },

  openInsert: (doc, database, collection, mode = 'tree') => {
    set({
      isOpen: true,
      action: 'insert',
      editorMode: mode,
      originalDocument: null,
      editedDocument: structuredClone(doc),
      database,
      collection,
      isDirty: true,
      confirmDialog: null
    });
  },

  closeEditor: () => {
    set({
      isOpen: false,
      action: 'edit',
      originalDocument: null,
      editedDocument: null,
      database: '',
      collection: '',
      isDirty: false,
      confirmDialog: null
    });
  },

  tryClose: () => {
    const { isDirty, closeEditor } = get();
    if (isDirty) {
      set({
        confirmDialog: {
          type: 'discard',
          onConfirm: () => {
            closeEditor();
          },
          onCancel: () => {
            set({ confirmDialog: null });
          }
        }
      });
    } else {
      closeEditor();
    }
  },

  setEditedDocument: (doc) => {
    const { originalDocument, action } = get();
    const isDirty = action === 'insert' || !documentsEqual(originalDocument, doc);
    set({ editedDocument: doc, isDirty });
  },

  setEditorMode: (mode) => set({ editorMode: mode }),

  resetToOriginal: () => {
    const { originalDocument } = get();
    if (originalDocument) {
      set({
        editedDocument: structuredClone(originalDocument),
        isDirty: false
      });
    }
  },

  requestSave: () => {
    set({
      confirmDialog: {
        type: 'update',
        onConfirm: async () => {
          const result = await get().executeSave();
          if (result.success) {
            set({ confirmDialog: null });
            get().closeEditor();
          }
        },
        onCancel: () => set({ confirmDialog: null })
      }
    });
  },

  requestDelete: () => {
    set({
      confirmDialog: {
        type: 'delete',
        onConfirm: async () => {
          const result = await get().executeDelete();
          if (result.success) {
            set({ confirmDialog: null });
            get().closeEditor();
          }
        },
        onCancel: () => set({ confirmDialog: null })
      }
    });
  },

  requestInsert: () => {
    set({
      confirmDialog: {
        type: 'insert',
        onConfirm: async () => {
          const result = await get().executeInsert();
          if (result.success) {
            set({ confirmDialog: null });
            get().closeEditor();
          }
        },
        onCancel: () => set({ confirmDialog: null })
      }
    });
  },

  setConfirmDialog: (dialog) => set({ confirmDialog: dialog }),

  executeSave: async () => {
    const { database, collection, originalDocument, editedDocument } = get();
    if (!originalDocument || !editedDocument) {
      return { success: false, error: 'No document to save' };
    }

    const idValue = originalDocument._id;
    const serializedId = JSON.stringify(idValue);

    const result = await window.api.updateDocument(
      database,
      collection,
      serializedId,
      editedDocument
    );
    const res = result as { success: boolean; cancelled?: boolean; error?: string };
    if (res.cancelled) {
      return { success: false };
    }
    return res;
  },

  executeDelete: async () => {
    const { database, collection, originalDocument } = get();
    if (!originalDocument) {
      return { success: false, error: 'No document to delete' };
    }

    const idValue = originalDocument._id;
    const serializedId = JSON.stringify(idValue);

    const result = await window.api.deleteDocument(database, collection, serializedId);
    const res = result as { success: boolean; cancelled?: boolean; error?: string };
    if (res.cancelled) {
      return { success: false };
    }
    return res;
  },

  executeInsert: async () => {
    const { database, collection, editedDocument } = get();
    if (!editedDocument) {
      return { success: false, error: 'No document to insert' };
    }

    const result = await window.api.insertDocument(database, collection, editedDocument);
    const res = result as { success: boolean; error?: string };
    return res;
  }
}));
