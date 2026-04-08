export interface DiffEntry {
  path: string;
  type: 'added' | 'removed' | 'changed';
  oldValue?: unknown;
  newValue?: unknown;
}

export function diffDocuments(original: unknown, modified: unknown): DiffEntry[] {
  const entries: DiffEntry[] = [];
  diffRecursive(original, modified, '', entries);
  return entries;
}

function diffRecursive(
  original: unknown,
  modified: unknown,
  path: string,
  entries: DiffEntry[]
): void {
  if (original === modified) return;

  // Both are arrays
  if (Array.isArray(original) && Array.isArray(modified)) {
    const maxLen = Math.max(original.length, modified.length);
    for (let i = 0; i < maxLen; i++) {
      const itemPath = path ? `${path}[${i}]` : `[${i}]`;
      if (i >= original.length) {
        entries.push({ path: itemPath, type: 'added', newValue: modified[i] });
      } else if (i >= modified.length) {
        entries.push({ path: itemPath, type: 'removed', oldValue: original[i] });
      } else {
        diffRecursive(original[i], modified[i], itemPath, entries);
      }
    }
    return;
  }

  // Both are plain objects
  if (isPlainObject(original) && isPlainObject(modified)) {
    const origObj = original as Record<string, unknown>;
    const modObj = modified as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(origObj), ...Object.keys(modObj)]);

    for (const key of allKeys) {
      const fieldPath = path ? `${path}.${key}` : key;
      if (!(key in origObj)) {
        entries.push({ path: fieldPath, type: 'added', newValue: modObj[key] });
      } else if (!(key in modObj)) {
        entries.push({ path: fieldPath, type: 'removed', oldValue: origObj[key] });
      } else {
        diffRecursive(origObj[key], modObj[key], fieldPath, entries);
      }
    }
    return;
  }

  // Primitives or type mismatch
  if (!deepEqual(original, modified)) {
    entries.push({
      path: path || '(root)',
      type: 'changed',
      oldValue: original,
      newValue: modified
    });
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
