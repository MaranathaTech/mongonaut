import type * as monacoType from 'monaco-editor/esm/vs/editor/editor.api'
import { monarchLanguage } from './monarch-tokenizer'
import { createCompletionProvider } from './completion-provider'
import { createHoverProvider } from './hover-provider'
import { createDiagnosticsProvider } from './diagnostics-provider'
import type { SchemaField } from '../../../../../shared/types'

const LANGUAGE_ID = 'mongodb'

let registered = false

export function registerMongoDBLanguage(monaco: typeof monacoType): void {
  if (registered) return
  registered = true

  // Register the language identifier
  monaco.languages.register({ id: LANGUAGE_ID })

  // Set the Monarch tokenizer
  monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, monarchLanguage)

  // Set language configuration (brackets, auto-closing, etc.)
  monaco.languages.setLanguageConfiguration(LANGUAGE_ID, {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/']
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"', notIn: ['string'] },
      { open: "'", close: "'", notIn: ['string'] },
      { open: '`', close: '`', notIn: ['string'] }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '`', close: '`' }
    ],
    folding: {
      markers: {
        start: /^\s*\{/,
        end: /^\s*\}/
      }
    },
    indentationRules: {
      increaseIndentPattern: /^\s*.*[\{\[\(]\s*$/,
      decreaseIndentPattern: /^\s*[\}\]\)]/
    }
  })

  // Define the MongoDB dark theme
  monaco.editor.defineTheme('mongodb-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword.operator', foreground: '569CD6' },
      { token: 'type.identifier', foreground: '4EC9B0' },
      { token: 'function', foreground: 'DCDCAA' },
      { token: 'variable', foreground: '9CDCFE' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'keyword', foreground: '569CD6' },
      { token: 'comment', foreground: '6A9955' },
      { token: 'regexp', foreground: 'D16969' },
      { token: 'identifier', foreground: 'D4D4D8' },
      { token: 'delimiter', foreground: 'D4D4D4' }
    ],
    colors: {
      'editor.background': '#18181B',
      'editor.foreground': '#D4D4D8',
      'editor.lineHighlightBackground': '#27272A',
      'editor.selectionBackground': '#3F3F46',
      'editorCursor.foreground': '#3B82F6',
      'editor.inactiveSelectionBackground': '#3F3F4680',
      'editorLineNumber.foreground': '#52525B',
      'editorLineNumber.activeForeground': '#A1A1AA',
      'editorWidget.background': '#27272A',
      'editorWidget.border': '#3F3F46',
      'editorSuggestWidget.background': '#27272A',
      'editorSuggestWidget.border': '#3F3F46',
      'editorSuggestWidget.selectedBackground': '#3F3F46',
      'input.background': '#18181B',
      'input.border': '#3F3F46'
    }
  })

  // Define the MongoDB light theme
  monaco.editor.defineTheme('mongodb-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword.operator', foreground: '0000FF' },
      { token: 'type.identifier', foreground: '267F99' },
      { token: 'function', foreground: '795E26' },
      { token: 'variable', foreground: '001080' },
      { token: 'string', foreground: 'A31515' },
      { token: 'number', foreground: '098658' },
      { token: 'keyword', foreground: '0000FF' },
      { token: 'comment', foreground: '008000' },
      { token: 'regexp', foreground: '811F3F' },
      { token: 'identifier', foreground: '1F2937' },
      { token: 'delimiter', foreground: '333333' }
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#1F2937',
      'editor.lineHighlightBackground': '#F3F4F6',
      'editor.selectionBackground': '#ADD6FF',
      'editorCursor.foreground': '#3B82F6',
      'editor.inactiveSelectionBackground': '#E5EBF1',
      'editorLineNumber.foreground': '#9CA3AF',
      'editorLineNumber.activeForeground': '#6B7280',
      'editorWidget.background': '#F9FAFB',
      'editorWidget.border': '#E5E7EB',
      'editorSuggestWidget.background': '#F9FAFB',
      'editorSuggestWidget.border': '#E5E7EB',
      'editorSuggestWidget.selectedBackground': '#E5E7EB',
      'input.background': '#FFFFFF',
      'input.border': '#D1D5DB'
    }
  })
}

/** Register the completion provider with dynamic collection/field data */
export function registerCompletionProvider(
  monaco: typeof monacoType,
  collections: string[],
  fields: SchemaField[]
): monacoType.IDisposable {
  return monaco.languages.registerCompletionItemProvider(
    LANGUAGE_ID,
    createCompletionProvider(collections, fields, monaco)
  )
}

/** Register the hover provider for operator docs and field types */
export function registerHoverProvider(
  monaco: typeof monacoType,
  fields: SchemaField[]
): monacoType.IDisposable {
  return monaco.languages.registerHoverProvider(
    LANGUAGE_ID,
    createHoverProvider(fields, monaco)
  )
}

/** Set up diagnostics for a specific model */
export function setupDiagnostics(
  monaco: typeof monacoType,
  model: monacoType.editor.ITextModel
): { dispose: () => void } {
  const provider = createDiagnosticsProvider(monaco)
  provider.validate(model)
  return { dispose: provider.dispose }
}
