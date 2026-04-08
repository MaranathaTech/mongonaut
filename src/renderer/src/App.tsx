import { useState, useMemo } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import AppShell from './components/AppShell'
import KeyboardShortcutsDialog from './components/KeyboardShortcutsDialog'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

// Import theme store to apply initial theme class on <html>
import './stores/theme-store'

function AppInner(): React.JSX.Element {
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [connectionDialogRequested, setConnectionDialogRequested] = useState(0)

  const shortcutActions = useMemo(
    () => ({
      onOpenShortcutsDialog: () => setShortcutsOpen(true),
      onOpenConnectionDialog: () => setConnectionDialogRequested((n) => n + 1)
    }),
    []
  )

  useKeyboardShortcuts(shortcutActions)

  return (
    <>
      <AppShell connectionDialogTrigger={connectionDialogRequested} />
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  )
}

function App(): React.JSX.Element {
  return (
    <ErrorBoundary fallbackLabel="Application">
      <AppInner />
    </ErrorBoundary>
  )
}

export default App
