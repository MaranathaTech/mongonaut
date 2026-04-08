import { useRef, useCallback, useEffect } from 'react';
import Editor, { type OnMount, type BeforeMount } from '@monaco-editor/react';
import type * as monacoType from 'monaco-editor/esm/vs/editor/editor.api';
import {
  registerMongoDBLanguage,
  registerCompletionProvider,
  registerHoverProvider,
  setupDiagnostics
} from './monaco-mongodb/language';
import { useBrowserStore } from '../../stores/browser-store';
import { useSchemaStore } from '../../stores/schema-store';
import { useThemeStore } from '../../stores/theme-store';
import type { SchemaField } from '../../../../shared/types';

interface QueryEditorProps {
  value: string;
  database: string;
  collection: string;
  onChange: (value: string) => void;
  onExecute: () => void;
  onFormat: () => void;
}

export default function QueryEditor({
  value,
  database,
  collection,
  onChange,
  onExecute,
  onFormat
}: QueryEditorProps): React.JSX.Element {
  const editorRef = useRef<monacoType.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monacoType | null>(null);
  const completionDisposableRef = useRef<monacoType.IDisposable | null>(null);
  const hoverDisposableRef = useRef<monacoType.IDisposable | null>(null);
  const diagnosticsDisposableRef = useRef<{ dispose: () => void } | null>(null);

  const theme = useThemeStore((s) => s.theme);
  const monacoTheme = theme === 'dark' ? 'mongodb-dark' : 'mongodb-light';

  const collections = useBrowserStore((s) => {
    const allCollections: string[] = [];
    for (const cols of Object.values(s.collections)) {
      for (const col of cols) {
        allCollections.push(col.name);
      }
    }
    return allCollections;
  });

  const schemaKey = `${database}.${collection}`;
  const fields: SchemaField[] = useSchemaStore((s) => s.schemas[schemaKey] ?? []);

  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    registerMongoDBLanguage(monaco);
  }, []);

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Register completion + hover providers
      completionDisposableRef.current = registerCompletionProvider(monaco, collections, fields);
      hoverDisposableRef.current = registerHoverProvider(monaco, fields);

      // Setup diagnostics for this model
      const model = editor.getModel();
      if (model) {
        diagnosticsDisposableRef.current = setupDiagnostics(monaco, model);
      }

      // Ctrl+Enter / Cmd+Enter → execute query
      editor.addAction({
        id: 'mongodb-execute-query',
        label: 'Execute Query',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
        run: () => onExecute()
      });

      // Ctrl+Shift+F / Cmd+Shift+F → format
      editor.addAction({
        id: 'mongodb-format-query',
        label: 'Format Query',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF],
        run: () => onFormat()
      });

      editor.focus();
    },
    [collections, fields, onExecute, onFormat]
  );

  // Update completion + hover providers when collections or fields change
  useEffect(() => {
    if (monacoRef.current) {
      completionDisposableRef.current?.dispose();
      hoverDisposableRef.current?.dispose();
      completionDisposableRef.current = registerCompletionProvider(
        monacoRef.current,
        collections,
        fields
      );
      hoverDisposableRef.current = registerHoverProvider(monacoRef.current, fields);
    }
  }, [collections, fields]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      completionDisposableRef.current?.dispose();
      hoverDisposableRef.current?.dispose();
      diagnosticsDisposableRef.current?.dispose();
    };
  }, []);

  return (
    <Editor
      language="mongodb"
      theme={monacoTheme}
      value={value}
      onChange={(v) => onChange(v ?? '')}
      beforeMount={handleBeforeMount}
      onMount={handleMount}
      options={{
        minimap: { enabled: false },
        lineNumbers: 'on',
        wordWrap: 'on',
        fontSize: 14,
        tabSize: 2,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        suggestOnTriggerCharacters: true,
        quickSuggestions: true,
        padding: { top: 8, bottom: 8 },
        renderLineHighlight: 'line',
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        overviewRulerBorder: false,
        scrollbar: {
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8
        }
      }}
      loading={
        <div className="flex h-full items-center justify-center bg-zinc-900 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500">
          <span className="text-sm">Loading editor...</span>
        </div>
      }
    />
  );
}
