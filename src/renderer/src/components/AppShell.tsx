import { useState, useCallback, useRef, useEffect } from 'react'
import Sidebar from './Sidebar'
import TabBar from './TabBar'
import StatusBar from './StatusBar'

const MIN_SIDEBAR_WIDTH = 200
const MAX_SIDEBAR_WIDTH = 600
const MIN_EDITOR_HEIGHT = 100

export default function AppShell(): React.JSX.Element {
  const [sidebarWidth, setSidebarWidth] = useState(280)
  const [editorHeightPercent, setEditorHeightPercent] = useState(40)
  const [isResizingSidebar, setIsResizingSidebar] = useState(false)
  const [isResizingEditor, setIsResizingEditor] = useState(false)
  const mainContentRef = useRef<HTMLDivElement>(null)

  const handleSidebarMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingSidebar(true)
  }, [])

  const handleEditorMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingEditor(true)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (isResizingSidebar) {
        const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, e.clientX))
        setSidebarWidth(newWidth)
      }
      if (isResizingEditor && mainContentRef.current) {
        const rect = mainContentRef.current.getBoundingClientRect()
        // Subtract TabBar height (~36px)
        const availableHeight = rect.height - 36
        const relativeY = e.clientY - rect.top - 36
        const percent = Math.min(
          80,
          Math.max(
            (MIN_EDITOR_HEIGHT / availableHeight) * 100,
            (relativeY / availableHeight) * 100
          )
        )
        setEditorHeightPercent(percent)
      }
    }

    const handleMouseUp = (): void => {
      setIsResizingSidebar(false)
      setIsResizingEditor(false)
    }

    if (isResizingSidebar || isResizingEditor) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = isResizingSidebar ? 'col-resize' : 'row-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizingSidebar, isResizingEditor])

  return (
    <div className="flex h-full flex-col bg-zinc-900 text-zinc-100">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className="flex-shrink-0 overflow-hidden border-r border-zinc-700 bg-zinc-800/50"
          style={{ width: sidebarWidth }}
        >
          <Sidebar />
        </div>

        {/* Sidebar resize handle */}
        <div
          className={`resize-handle resize-handle-horizontal ${isResizingSidebar ? 'active' : ''}`}
          onMouseDown={handleSidebarMouseDown}
        />

        {/* Main content area */}
        <div ref={mainContentRef} className="flex flex-1 flex-col overflow-hidden">
          <TabBar />

          {/* Editor area */}
          <div
            className="overflow-auto border-b border-zinc-700 bg-zinc-900"
            style={{ height: `${editorHeightPercent}%` }}
          >
            <div className="flex h-full items-center justify-center text-zinc-500">
              <p className="text-sm">Select a collection to start querying</p>
            </div>
          </div>

          {/* Editor/Results resize handle */}
          <div
            className={`resize-handle resize-handle-vertical ${isResizingEditor ? 'active' : ''}`}
            onMouseDown={handleEditorMouseDown}
          />

          {/* Results area */}
          <div className="flex-1 overflow-auto bg-zinc-900">
            <div className="flex h-full items-center justify-center text-zinc-500">
              <p className="text-sm">Run a query to see results</p>
            </div>
          </div>
        </div>
      </div>

      <StatusBar />
    </div>
  )
}
