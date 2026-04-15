import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import {
  queryOperators,
  aggregationStages,
  updateOperators,
  collectionMethods,
  type OperatorInfo
} from './mongodb-operators';
import type { SchemaField } from '../../../../../shared/types';

function operatorToCompletionItem(
  op: OperatorInfo,
  range: monaco.IRange,
  monacoInstance: typeof monaco,
  kind: monaco.languages.CompletionItemKind
): monaco.languages.CompletionItem {
  return {
    label: op.label,
    kind,
    detail: op.detail,
    documentation: op.documentation,
    insertText: op.insertText,
    insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range
  };
}

/** Context analysis to determine what kind of completions to show */
function getContext(
  model: monaco.editor.ITextModel,
  position: monaco.Position
): 'dollar' | 'db-dot' | 'collection-method' | 'aggregation-stage' | 'general' {
  const lineContent = model.getLineContent(position.lineNumber);
  const textBeforeCursor = lineContent.substring(0, position.column - 1);

  // After db.getCollection("name"). → suggest methods
  if (/db\.getCollection\s*\(\s*["'][^"']+["']\s*\)\.\s*$/.test(textBeforeCursor)) {
    return 'collection-method';
  }

  // After db["name"]. → suggest methods
  if (/db\s*\[\s*["'][^"']+["']\s*\]\.\s*$/.test(textBeforeCursor)) {
    return 'collection-method';
  }

  // After db.collectionName. → suggest methods
  if (/db\.\w+\.\s*$/.test(textBeforeCursor)) {
    return 'collection-method';
  }

  // After db. → suggest collection names
  if (/db\.\s*$/.test(textBeforeCursor)) {
    return 'db-dot';
  }

  // After $ → suggest operators
  if (/\$\w*$/.test(textBeforeCursor)) {
    return 'dollar';
  }

  // Inside aggregate array → suggest stages
  const fullText = model.getValue();
  const offset = model.getOffsetAt(position);
  const textBefore = fullText.substring(0, offset);
  if (/\.aggregate\s*\(\s*\[/.test(textBefore)) {
    // Check we haven't closed the aggregate yet
    const afterAggregate = textBefore.substring(textBefore.lastIndexOf('.aggregate'));
    let bracketDepth = 0;
    for (const ch of afterAggregate) {
      if (ch === '[') bracketDepth++;
      if (ch === ']') bracketDepth--;
    }
    if (bracketDepth > 0) {
      return 'aggregation-stage';
    }
  }

  return 'general';
}

export function createCompletionProvider(
  collections: string[],
  fields: SchemaField[],
  monacoInstance: typeof monaco
): monaco.languages.CompletionItemProvider {
  return {
    triggerCharacters: ['$', '.', '{'],

    provideCompletionItems(
      model: monaco.editor.ITextModel,
      position: monaco.Position
    ): monaco.languages.ProviderResult<monaco.languages.CompletionList> {
      const word = model.getWordUntilPosition(position);
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };

      const context = getContext(model, position);
      const suggestions: monaco.languages.CompletionItem[] = [];

      switch (context) {
        case 'dollar': {
          // Expand range to include the $ prefix
          const dollarRange: monaco.IRange = {
            ...range,
            startColumn: Math.max(1, range.startColumn - 1)
          };
          const allOperators = [...queryOperators, ...aggregationStages, ...updateOperators];
          // Deduplicate by label (some operators like $set appear in multiple categories)
          const seen = new Set<string>();
          for (const op of allOperators) {
            if (!seen.has(op.label)) {
              seen.add(op.label);
              suggestions.push(
                operatorToCompletionItem(
                  op,
                  dollarRange,
                  monacoInstance,
                  monacoInstance.languages.CompletionItemKind.Keyword
                )
              );
            }
          }
          break;
        }

        case 'db-dot': {
          for (const col of collections) {
            suggestions.push({
              label: col,
              kind: monacoInstance.languages.CompletionItemKind.Field,
              detail: 'Collection',
              documentation: `Collection: ${col}`,
              insertText: col,
              range
            });
          }
          break;
        }

        case 'collection-method': {
          for (const method of collectionMethods) {
            suggestions.push(
              operatorToCompletionItem(
                method,
                range,
                monacoInstance,
                monacoInstance.languages.CompletionItemKind.Method
              )
            );
          }
          break;
        }

        case 'aggregation-stage': {
          for (const stage of aggregationStages) {
            suggestions.push(
              operatorToCompletionItem(
                stage,
                range,
                monacoInstance,
                monacoInstance.languages.CompletionItemKind.Snippet
              )
            );
          }
          break;
        }

        case 'general': {
          // Suggest field names if available (with type info)
          for (const field of fields) {
            const typeStr = field.types.join(' | ');
            const pct = Math.round(field.frequency * 100);
            suggestions.push({
              label: field.path,
              kind: monacoInstance.languages.CompletionItemKind.Property,
              detail: typeStr,
              documentation: `Field: ${field.path}\nTypes: ${typeStr}\nFrequency: ${pct}%`,
              insertText: field.path,
              sortText: String(1000 - pct).padStart(4, '0'),
              range
            });
          }
          // Suggest db keyword
          suggestions.push({
            label: 'db',
            kind: monacoInstance.languages.CompletionItemKind.Keyword,
            detail: 'Database',
            documentation: 'Reference to the current database.',
            insertText: 'db',
            range
          });
          break;
        }
      }

      return { suggestions };
    }
  };
}
