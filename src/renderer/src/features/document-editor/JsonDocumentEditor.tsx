import { useRef, useCallback, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { SerializedDocument } from '../../../../shared/types';

interface JsonDocumentEditorProps {
  document: SerializedDocument;
  onChange: (doc: SerializedDocument) => void;
  onReset: () => void;
}

export default function JsonDocumentEditor({
  document,
  onChange,
  onReset
}: JsonDocumentEditorProps): React.JSX.Element {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const initialValue = JSON.stringify(document, null, 2);

  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (!value) return;
      try {
        const parsed = JSON.parse(value);
        setParseError(null);
        onChange(parsed);
      } catch (err) {
        setParseError(err instanceof Error ? err.message : 'Invalid JSON');
      }
    },
    [onChange]
  );

  const handleFormat = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  }, []);

  const handleResetEditor = useCallback(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        // onReset will update the document prop, which triggers re-render
        onReset();
      }
    }
  }, [onReset]);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/30 px-3 py-1">
        <button
          className="rounded px-2 py-0.5 text-xs text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700 hover:text-gray-700 dark:hover:text-zinc-200"
          onClick={handleFormat}
        >
          Format
        </button>
        <button
          className="rounded px-2 py-0.5 text-xs text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700 hover:text-gray-700 dark:hover:text-zinc-200"
          onClick={handleResetEditor}
        >
          Reset
        </button>
        {parseError && <span className="ml-2 text-xs text-red-400">{parseError}</span>}
      </div>

      {/* Editor */}
      <div className="flex-1">
        <Editor
          defaultLanguage="json"
          defaultValue={initialValue}
          theme="vs-dark"
          onMount={handleMount}
          onChange={handleChange}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            padding: { top: 8 }
          }}
        />
      </div>
    </div>
  );
}
