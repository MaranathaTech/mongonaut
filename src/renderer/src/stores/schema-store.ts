import { create } from 'zustand'
import type { SchemaField } from '../../../shared/types'

interface SchemaState {
  schemas: Record<string, SchemaField[]> // keyed by "database.collection"
  isLoading: boolean

  loadSchema: (database: string, collection: string) => Promise<void>
  getFieldNames: (database: string, collection: string) => string[]
  getFields: (database: string, collection: string) => SchemaField[]
  invalidate: (database: string, collection: string) => void
}

export const useSchemaStore = create<SchemaState>((set, get) => ({
  schemas: {},
  isLoading: false,

  loadSchema: async (database: string, collection: string) => {
    const key = `${database}.${collection}`
    set({ isLoading: true })
    try {
      const fields: SchemaField[] = await window.api.sampleSchema(database, collection)
      set((state) => ({
        schemas: { ...state.schemas, [key]: fields },
        isLoading: false
      }))
    } catch {
      set({ isLoading: false })
    }
  },

  getFieldNames: (database: string, collection: string) => {
    const key = `${database}.${collection}`
    const fields = get().schemas[key]
    return fields ? fields.map((f) => f.path) : []
  },

  getFields: (database: string, collection: string) => {
    const key = `${database}.${collection}`
    return get().schemas[key] ?? []
  },

  invalidate: (database: string, collection: string) => {
    const key = `${database}.${collection}`
    set((state) => {
      const schemas = { ...state.schemas }
      delete schemas[key]
      return { schemas }
    })
  }
}))
