import { create } from 'zustand'
import type { TabInfo } from '../../../shared/types'

interface EditorState {
  tabs: TabInfo[]
  activeTabId: string | null

  addTab: (tab: TabInfo) => void
  removeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateTabQuery: (id: string, queryText: string) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  tabs: [],
  activeTabId: null,

  addTab: (tab) =>
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id
    })),

  removeTab: (id) =>
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== id)
      const newActiveId =
        state.activeTabId === id
          ? (newTabs[newTabs.length - 1]?.id ?? null)
          : state.activeTabId
      return { tabs: newTabs, activeTabId: newActiveId }
    }),

  setActiveTab: (id) => set({ activeTabId: id }),

  updateTabQuery: (id, queryText) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, queryText, isDirty: true } : t))
    }))
}))
