import { useEffect, useCallback } from 'react'
import { useEditorStore } from '../stores/editor-store'
import { useResultsStore } from '../stores/results-store'
import { useDocumentStore } from '../stores/document-store'

interface ShortcutActions {
  onOpenShortcutsDialog: () => void
  onOpenConnectionDialog: () => void
}

export function useKeyboardShortcuts(actions: ShortcutActions): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey
      const isShift = e.shiftKey
      const target = e.target as HTMLElement
      const isInInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT'
      // Monaco uses a contentEditable div
      const isInEditor = target.closest('.monaco-editor') !== null

      // Ctrl+Shift+Enter — Explain query
      if (isCtrl && isShift && e.key === 'Enter') {
        e.preventDefault()
        const { tabs, activeTabId } = useEditorStore.getState()
        const activeTab = tabs.find((t) => t.id === activeTabId)
        if (activeTab) {
          useResultsStore.getState().explainQuery(activeTab.database, activeTab.collection, activeTab.queryText)
        }
        return
      }

      // Ctrl+N — New tab
      if (isCtrl && !isShift && e.key === 'n') {
        e.preventDefault()
        useEditorStore.getState().addTab({
          id: `tab-${Date.now()}`,
          title: 'Untitled',
          database: '',
          collection: '',
          queryText: '',
          isDirty: false
        })
        return
      }

      // Ctrl+W — Close current tab
      if (isCtrl && !isShift && e.key === 'w') {
        e.preventDefault()
        const { tabs, activeTabId, removeTab } = useEditorStore.getState()
        if (activeTabId) {
          const tab = tabs.find((t) => t.id === activeTabId)
          if (tab?.isDirty) {
            if (!window.confirm('This tab has unsaved changes. Close anyway?')) return
          }
          removeTab(activeTabId)
        }
        return
      }

      // Ctrl+Tab — Next tab
      if (isCtrl && !isShift && e.key === 'Tab') {
        e.preventDefault()
        const { tabs, activeTabId, setActiveTab } = useEditorStore.getState()
        if (tabs.length > 1 && activeTabId) {
          const idx = tabs.findIndex((t) => t.id === activeTabId)
          const nextIdx = (idx + 1) % tabs.length
          setActiveTab(tabs[nextIdx].id)
        }
        return
      }

      // Ctrl+Shift+Tab — Previous tab
      if (isCtrl && isShift && e.key === 'Tab') {
        e.preventDefault()
        const { tabs, activeTabId, setActiveTab } = useEditorStore.getState()
        if (tabs.length > 1 && activeTabId) {
          const idx = tabs.findIndex((t) => t.id === activeTabId)
          const prevIdx = (idx - 1 + tabs.length) % tabs.length
          setActiveTab(tabs[prevIdx].id)
        }
        return
      }

      // Ctrl+L — Focus connection dialog
      if (isCtrl && !isShift && e.key === 'l') {
        e.preventDefault()
        actions.onOpenConnectionDialog()
        return
      }

      // F5 — Refresh results
      if (e.key === 'F5' && !isCtrl) {
        e.preventDefault()
        const { lastQuery, executeQuery } = useResultsStore.getState()
        if (lastQuery) {
          executeQuery(lastQuery.database, lastQuery.collection, lastQuery.queryText)
        }
        return
      }

      // Escape — Close document editor panel or dialogs
      if (e.key === 'Escape') {
        const docStore = useDocumentStore.getState()
        if (docStore.confirmDialog) {
          docStore.confirmDialog.onCancel()
          return
        }
        if (docStore.isOpen) {
          docStore.tryClose()
          return
        }
        return
      }

      // ? — Show keyboard shortcuts (not when in input/editor)
      if (e.key === '?' && !isCtrl && !isInInput && !isInEditor) {
        actions.onOpenShortcutsDialog()
        return
      }
    },
    [actions]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
