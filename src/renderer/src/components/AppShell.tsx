import { useState, useCallback, useRef, useEffect } from 'react';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';
import ErrorBoundary from './ErrorBoundary';
import EditorPanel from '../features/editor/EditorPanel';
import ResultsPanel from '../features/results/ResultsPanel';

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 600;
const MIN_EDITOR_HEIGHT = 100;

const STORAGE_KEY_SIDEBAR = 'mongonaut-sidebar-width';
const STORAGE_KEY_EDITOR = 'mongonaut-editor-height';

function loadNumber(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key);
    if (v !== null) return Number(v);
  } catch {
    // ignore
  }
  return fallback;
}

interface AppShellProps {
  connectionDialogTrigger?: number;
}

export default function AppShell({ connectionDialogTrigger }: AppShellProps): React.JSX.Element {
  const [sidebarWidth, setSidebarWidth] = useState(() => loadNumber(STORAGE_KEY_SIDEBAR, 280));
  const [editorHeightPercent, setEditorHeightPercent] = useState(() =>
    loadNumber(STORAGE_KEY_EDITOR, 40)
  );
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingEditor, setIsResizingEditor] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const handleSidebarMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
  }, []);

  const handleEditorMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingEditor(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (isResizingSidebar) {
        const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, e.clientX));
        setSidebarWidth(newWidth);
      }
      if (isResizingEditor && mainContentRef.current) {
        const rect = mainContentRef.current.getBoundingClientRect();
        const availableHeight = rect.height;
        const relativeY = e.clientY - rect.top;
        const percent = Math.min(
          80,
          Math.max((MIN_EDITOR_HEIGHT / availableHeight) * 100, (relativeY / availableHeight) * 100)
        );
        setEditorHeightPercent(percent);
      }
    };

    const handleMouseUp = (): void => {
      if (isResizingSidebar) {
        localStorage.setItem(STORAGE_KEY_SIDEBAR, String(sidebarWidth));
      }
      if (isResizingEditor) {
        localStorage.setItem(STORAGE_KEY_EDITOR, String(editorHeightPercent));
      }
      setIsResizingSidebar(false);
      setIsResizingEditor(false);
    };

    if (isResizingSidebar || isResizingEditor) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isResizingSidebar ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingSidebar, isResizingEditor, sidebarWidth, editorHeightPercent]);

  return (
    <div className="flex h-full flex-col bg-white text-gray-900 dark:bg-zinc-900 dark:text-zinc-100">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className="flex-shrink-0 overflow-hidden border-r border-gray-200 bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800/50"
          style={{ width: sidebarWidth }}
        >
          <ErrorBoundary fallbackLabel="Sidebar">
            <Sidebar connectionDialogTrigger={connectionDialogTrigger} />
          </ErrorBoundary>
        </div>

        {/* Sidebar resize handle */}
        <div
          className={`resize-handle resize-handle-horizontal ${isResizingSidebar ? 'active' : ''}`}
          onMouseDown={handleSidebarMouseDown}
        />

        {/* Main content area */}
        <div ref={mainContentRef} className="flex flex-1 flex-col overflow-hidden">
          {/* Editor area (tabs + toolbar + Monaco editor) */}
          <div
            className="overflow-hidden border-b border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
            style={{ height: `${editorHeightPercent}%` }}
          >
            <ErrorBoundary fallbackLabel="Editor">
              <EditorPanel />
            </ErrorBoundary>
          </div>

          {/* Editor/Results resize handle */}
          <div
            className={`resize-handle resize-handle-vertical ${isResizingEditor ? 'active' : ''}`}
            onMouseDown={handleEditorMouseDown}
          />

          {/* Results area */}
          <div className="flex-1 overflow-hidden bg-white dark:bg-zinc-900">
            <ErrorBoundary fallbackLabel="Results">
              <ResultsPanel />
            </ErrorBoundary>
          </div>
        </div>
      </div>

      <StatusBar />
    </div>
  );
}
