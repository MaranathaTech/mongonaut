import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

interface BracketInfo {
  char: string;
  line: number;
  column: number;
}

export function createDiagnosticsProvider(monacoInstance: typeof monaco): {
  validate: (model: monaco.editor.ITextModel) => void;
  dispose: () => void;
} {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let disposable: monaco.IDisposable | null = null;

  function validate(model: monaco.editor.ITextModel): void {
    const markers: monaco.editor.IMarkerData[] = [];
    const content = model.getValue();

    checkUnbalancedBrackets(content, model, markers, monacoInstance);
    checkTrailingCommas(content, model, markers, monacoInstance);

    monacoInstance.editor.setModelMarkers(model, 'mongodb', markers);
  }

  function debouncedValidate(model: monaco.editor.ITextModel): void {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => validate(model), 500);
  }

  function setup(model: monaco.editor.ITextModel): void {
    // Initial validation
    validate(model);
    // Re-validate on content change
    disposable = model.onDidChangeContent(() => debouncedValidate(model));
  }

  return {
    validate: setup,
    dispose(): void {
      if (timeoutId) clearTimeout(timeoutId);
      disposable?.dispose();
    }
  };
}

function checkUnbalancedBrackets(
  content: string,
  model: monaco.editor.ITextModel,
  markers: monaco.editor.IMarkerData[],
  monacoInstance: typeof monaco
): void {
  const pairs: Record<string, string> = { '{': '}', '[': ']', '(': ')' };
  const closers: Record<string, string> = { '}': '{', ']': '[', ')': '(' };
  const stack: BracketInfo[] = [];
  let inString = false;
  let stringChar = '';
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    // Handle line endings
    if (ch === '\n') {
      inLineComment = false;
      continue;
    }

    // Handle block comments
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    // Handle line comments
    if (inLineComment) continue;

    // Start of comment
    if (!inString && ch === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (!inString && ch === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }

    // Handle strings
    if (inString) {
      if (ch === '\\') {
        i++; // skip escaped character
        continue;
      }
      if (ch === stringChar) {
        inString = false;
      }
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      inString = true;
      stringChar = ch;
      continue;
    }

    // Track brackets
    const pos = model.getPositionAt(i);
    if (pairs[ch]) {
      stack.push({ char: ch, line: pos.lineNumber, column: pos.column });
    } else if (closers[ch]) {
      if (stack.length === 0 || stack[stack.length - 1].char !== closers[ch]) {
        markers.push({
          severity: monacoInstance.MarkerSeverity.Error,
          message: `Unmatched closing '${ch}'`,
          startLineNumber: pos.lineNumber,
          startColumn: pos.column,
          endLineNumber: pos.lineNumber,
          endColumn: pos.column + 1
        });
      } else {
        stack.pop();
      }
    }
  }

  // Remaining unmatched openers
  for (const open of stack) {
    markers.push({
      severity: monacoInstance.MarkerSeverity.Error,
      message: `Unmatched opening '${open.char}'`,
      startLineNumber: open.line,
      startColumn: open.column,
      endLineNumber: open.line,
      endColumn: open.column + 1
    });
  }
}

function checkTrailingCommas(
  content: string,
  model: monaco.editor.ITextModel,
  markers: monaco.editor.IMarkerData[],
  monacoInstance: typeof monaco
): void {
  // Match comma followed by optional whitespace/newlines then a closing bracket
  const trailingCommaRegex = /,\s*(?=[}\]])/g;
  let match: RegExpExecArray | null;

  while ((match = trailingCommaRegex.exec(content)) !== null) {
    const pos = model.getPositionAt(match.index);
    markers.push({
      severity: monacoInstance.MarkerSeverity.Warning,
      message: 'Trailing comma (allowed in MongoDB shell, but may cause issues)',
      startLineNumber: pos.lineNumber,
      startColumn: pos.column,
      endLineNumber: pos.lineNumber,
      endColumn: pos.column + 1
    });
  }
}
