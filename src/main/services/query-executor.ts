import type { Sort } from 'mongodb';
import { connectionManager } from './connection-manager';
import { serializeDocuments, serializeDocument } from '../lib/safe-bson';
import type { QueryRequest, QueryResult } from '../../shared/types';

/**
 * Given a string and the index of an opening paren `(`, returns the index of
 * the matching closing paren `)`. Respects string literals (single + double
 * quoted, with backslash escapes). Throws if unbalanced.
 */
export function findMatchingParen(text: string, openIdx: number): number {
  if (text[openIdx] !== '(') throw new Error('Expected opening paren');
  let depth = 0;
  let i = openIdx;
  let inString: '"' | "'" | null = null;
  let escaped = false;
  while (i < text.length) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === inString) {
        inString = null;
      }
    } else {
      if (ch === '"' || ch === "'") {
        inString = ch;
      } else if (ch === '(') {
        depth++;
      } else if (ch === ')') {
        depth--;
        if (depth === 0) return i;
      }
    }
    i++;
  }
  throw new Error('Unbalanced parentheses in query');
}

const FORBIDDEN_OPERATORS = new Set(['$where', '$function', '$accumulator']);

export function sanitizeFilter(value: unknown, path: string = ''): void {
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => sanitizeFilter(v, `${path}[${i}]`));
    return;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_OPERATORS.has(k)) {
      throw new Error(`Operator "${k}" is not allowed`);
    }
    sanitizeFilter(v, path ? `${path}.${k}` : k);
  }
}

interface ParsedQuery {
  method: string;
  filter?: Record<string, unknown>;
  sort?: Sort;
  projection?: Record<string, unknown>;
  limit?: number;
  skip?: number;
  pipeline?: Record<string, unknown>[];
  field?: string;
}

class QueryExecutor {
  async execute(request: QueryRequest): Promise<QueryResult> {
    const { database, collection, queryText, page = 1, pageSize = 50 } = request;

    const startTime = Date.now();
    const client = connectionManager.getClient();
    const coll = client.db(database).collection(collection);

    const parsed = this.parseQuery(queryText);

    // Reject dangerous operators before executing
    if (parsed.filter) sanitizeFilter(parsed.filter);
    if (parsed.pipeline) {
      for (const stage of parsed.pipeline) sanitizeFilter(stage);
    }

    let documents: unknown[];
    let totalCount: number;

    if (parsed.method === 'aggregate') {
      const pipeline = parsed.pipeline || [];

      // Count via separate pipeline
      const countPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await coll.aggregate(countPipeline).toArray();
      totalCount = countResult[0]?.total ?? 0;

      const paginatedPipeline = [
        ...pipeline,
        { $skip: (page - 1) * pageSize },
        { $limit: pageSize }
      ];
      documents = await coll.aggregate(paginatedPipeline).toArray();
    } else if (parsed.method === 'find') {
      totalCount = await coll.countDocuments(parsed.filter || {});
      let cursor = coll.find(parsed.filter || {});
      if (parsed.sort) cursor = cursor.sort(parsed.sort);
      if (parsed.projection) cursor = cursor.project(parsed.projection);
      cursor = cursor.skip((page - 1) * pageSize).limit(pageSize);
      documents = await cursor.toArray();
    } else if (parsed.method === 'countDocuments') {
      const count = await coll.countDocuments(parsed.filter || {});
      documents = [{ count }];
      totalCount = 1;
    } else if (parsed.method === 'distinct') {
      const values = await coll.distinct(parsed.field!, parsed.filter || {});
      documents = values.map((v) => ({ value: v }));
      totalCount = documents.length;
    } else {
      throw new Error(
        `Unsupported method: ${parsed.method}. Supported: find, aggregate, countDocuments, distinct`
      );
    }

    const executionTimeMs = Date.now() - startTime;

    return {
      documents: serializeDocuments(documents) as Record<string, unknown>[],
      totalCount,
      executionTimeMs,
      page,
      pageSize
    };
  }

  async explain(request: QueryRequest): Promise<unknown> {
    const client = connectionManager.getClient();
    const coll = client.db(request.database).collection(request.collection);
    const parsed = this.parseQuery(request.queryText);

    // Reject dangerous operators before executing
    if (parsed.filter) sanitizeFilter(parsed.filter);
    if (parsed.pipeline) {
      for (const stage of parsed.pipeline) sanitizeFilter(stage);
    }

    let result: unknown;
    if (parsed.method === 'find') {
      result = await coll.find(parsed.filter || {}).explain('executionStats');
    } else if (parsed.method === 'aggregate') {
      result = await coll.aggregate(parsed.pipeline || []).explain('executionStats');
    } else {
      throw new Error('Explain is only supported for find and aggregate');
    }

    return serializeDocument(result);
  }

  private parseQuery(queryText: string): ParsedQuery {
    const text = queryText.trim();

    // Try db.getCollection("name").method(...) pattern
    const getCollMatch = text.match(/^db\.getCollection\s*\(\s*["']([^"']+)["']\s*\)\.(\w+)\s*\(/);
    if (getCollMatch) {
      const method = getCollMatch[2];
      const afterPrefix = text.slice(getCollMatch[0].length - 1);
      const openIdx = 0;
      const closeIdx = findMatchingParen(afterPrefix, openIdx);
      const argsStr = afterPrefix.slice(openIdx + 1, closeIdx).trim();
      const chainStr = afterPrefix.slice(closeIdx + 1).trim();
      return this.parseMethodCall(method, argsStr, chainStr);
    }

    // Try db["name"].method(...) bracket notation pattern
    const bracketMatch = text.match(/^db\s*\[\s*["']([^"']+)["']\s*\]\.(\w+)\s*\(/);
    if (bracketMatch) {
      const method = bracketMatch[2];
      const afterPrefix = text.slice(bracketMatch[0].length - 1);
      const openIdx = 0;
      const closeIdx = findMatchingParen(afterPrefix, openIdx);
      const argsStr = afterPrefix.slice(openIdx + 1, closeIdx).trim();
      const chainStr = afterPrefix.slice(closeIdx + 1).trim();
      return this.parseMethodCall(method, argsStr, chainStr);
    }

    // Try db.collection.method(...) pattern using depth-aware paren walker
    const prefixMatch = text.match(/^db\.\w+\.(\w+)\s*\(/);
    if (prefixMatch) {
      const method = prefixMatch[1];
      const openIdx = prefixMatch[0].length - 1;
      const closeIdx = findMatchingParen(text, openIdx);
      const argsStr = text.slice(openIdx + 1, closeIdx).trim();
      const chainStr = text.slice(closeIdx + 1).trim();
      return this.parseMethodCall(method, argsStr, chainStr);
    }

    // Implicit aggregate — starts with [
    if (text.startsWith('[')) {
      const pipeline = this.safeParseJSON(text) as Record<string, unknown>[];
      if (!Array.isArray(pipeline)) {
        throw new Error('Aggregate pipeline must be an array');
      }
      return { method: 'aggregate', pipeline };
    }

    // Implicit find — starts with {
    if (text.startsWith('{')) {
      const filter = this.safeParseJSON(text) as Record<string, unknown>;
      return { method: 'find', filter };
    }

    throw new Error(
      'Could not parse query. Expected: db.collection.find({...}), [{$match: ...}], or {field: value}'
    );
  }

  private parseMethodCall(method: string, argsStr: string, chainStr: string): ParsedQuery {
    const result: ParsedQuery = { method };

    if (method === 'aggregate') {
      const trimmed = argsStr.trim();
      if (trimmed) {
        result.pipeline = this.safeParseJSON(trimmed) as Record<string, unknown>[];
        if (!Array.isArray(result.pipeline)) {
          throw new Error('Aggregate pipeline must be an array');
        }
      } else {
        result.pipeline = [];
      }
      return result;
    }

    if (method === 'distinct') {
      // distinct(field, filter)
      const parts = this.splitTopLevelArgs(argsStr);
      if (parts.length >= 1) {
        const fieldStr = parts[0].trim();
        // Remove quotes around field name
        result.field = fieldStr.replace(/^['"]|['"]$/g, '');
      }
      if (parts.length >= 2) {
        result.filter = this.safeParseJSON(parts[1].trim()) as Record<string, unknown>;
      }
      return result;
    }

    // find, countDocuments — first arg is filter, second is projection (for find)
    const parts = this.splitTopLevelArgs(argsStr);

    if (parts.length >= 1 && parts[0].trim()) {
      result.filter = this.safeParseJSON(parts[0].trim()) as Record<string, unknown>;
    }
    if (method === 'find' && parts.length >= 2 && parts[1].trim()) {
      result.projection = this.safeParseJSON(parts[1].trim()) as Record<string, unknown>;
    }

    // Parse chained methods using depth-aware paren walker
    if (chainStr) {
      let pos = 0;
      while (pos < chainStr.length) {
        while (pos < chainStr.length && /\s/.test(chainStr[pos])) pos++;
        if (pos >= chainStr.length) break;
        if (chainStr[pos] !== '.') {
          throw new Error('Invalid query: expected "." between chained methods');
        }
        pos++;
        const nameMatch = chainStr.slice(pos).match(/^(\w+)\s*\(/);
        if (!nameMatch) {
          throw new Error('Invalid query: expected method name after "."');
        }
        const chainMethod = nameMatch[1];
        const openIdx = pos + nameMatch[0].length - 1;
        const closeIdx = findMatchingParen(chainStr, openIdx);
        const chainArg = chainStr.slice(openIdx + 1, closeIdx).trim();
        pos = closeIdx + 1;

        if (chainMethod === 'sort' && chainArg) {
          result.sort = this.safeParseJSON(chainArg) as Sort;
        } else if (chainMethod === 'limit' && chainArg) {
          result.limit = parseInt(chainArg, 10);
        } else if (chainMethod === 'skip' && chainArg) {
          result.skip = parseInt(chainArg, 10);
        } else if (chainMethod === 'project' && chainArg) {
          result.projection = this.safeParseJSON(chainArg) as Record<string, unknown>;
        }
      }
    }

    return result;
  }

  /**
   * Split a string by commas at the top level (not inside braces/brackets/strings).
   */
  private splitTopLevelArgs(argsStr: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    let inString: string | null = null;

    for (let i = 0; i < argsStr.length; i++) {
      const ch = argsStr[i];
      const prev = i > 0 ? argsStr[i - 1] : '';

      if (inString) {
        current += ch;
        if (ch === inString && prev !== '\\') {
          inString = null;
        }
        continue;
      }

      if (ch === '"' || ch === "'") {
        inString = ch;
        current += ch;
        continue;
      }

      if (ch === '{' || ch === '[' || ch === '(') {
        depth++;
        current += ch;
        continue;
      }

      if (ch === '}' || ch === ']' || ch === ')') {
        depth--;
        current += ch;
        continue;
      }

      if (ch === ',' && depth === 0) {
        parts.push(current);
        current = '';
        continue;
      }

      current += ch;
    }

    if (current.trim()) {
      parts.push(current);
    }

    return parts;
  }

  /**
   * Parse JSON-like text that uses MongoDB shell syntax:
   * - Unquoted keys: {name: "test"}
   * - Single quotes: {'name': 'test'}
   * - BSON constructors: ObjectId("..."), ISODate("..."), NumberLong("...")
   * - Trailing commas
   * - Regex literals: /pattern/flags
   */
  safeParseJSON(text: string): unknown {
    let processed = text.trim();

    // Step 1: Replace BSON constructors with Extended JSON equivalents
    processed = processed.replace(
      /\bObjectId\s*\(\s*["']([a-fA-F0-9]{24})["']\s*\)/g,
      '{"$oid": "$1"}'
    );
    processed = processed.replace(/\bISODate\s*\(\s*["']([^"']+)["']\s*\)/g, '{"$date": "$1"}');
    processed = processed.replace(/\bnew\s+Date\s*\(\s*["']([^"']+)["']\s*\)/g, '{"$date": "$1"}');
    processed = processed.replace(
      /\bNumberLong\s*\(\s*["']?(\d+)["']?\s*\)/g,
      '{"$numberLong": "$1"}'
    );
    processed = processed.replace(
      /\bNumberDecimal\s*\(\s*["']([^"']+)["']\s*\)/g,
      '{"$numberDecimal": "$1"}'
    );
    processed = processed.replace(
      /\bTimestamp\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/g,
      '{"$timestamp": {"t": $1, "i": $2}}'
    );
    // String-aware regex-literal rewrite: /pattern/flags → {"$regex": ..., "$options": ...}
    // Only treat `/` as a regex literal when outside a string and preceded by `:`, `,`, `[`, or `(`
    // (ignoring whitespace). Uses JSON.stringify for safe escaping.
    processed = this.rewriteRegexLiterals(processed);

    // Step 2: Replace single quotes with double quotes
    // Must be careful not to replace single quotes inside double-quoted strings
    processed = this.replaceSingleQuotes(processed);

    // Step 3: Quote unquoted keys
    // Match word chars (and $ prefix, dot notation) before a colon that aren't already quoted
    processed = processed.replace(/([{,]\s*)([$a-zA-Z_][$a-zA-Z0-9_.]*)\s*:/g, '$1"$2":');

    // Step 4: Remove trailing commas before } or ]
    processed = processed.replace(/,\s*([}\]])/g, '$1');

    // Step 5: Parse
    try {
      return JSON.parse(processed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.debug('[query-executor] parse failure', { original: text, processed, err });
      const posMatch = msg.match(/at position (\d+)/);
      throw new Error(
        posMatch ? `Failed to parse query at position ${posMatch[1]}` : 'Failed to parse query'
      );
    }
  }

  /**
   * Walk text character-by-character, rewriting `/pattern/flags` regex literals
   * only when outside string literals. A `/` is treated as a regex start only
   * when the last non-whitespace character is one of `:`, `,`, `[`, `(`.
   */
  private rewriteRegexLiterals(text: string): string {
    const chars: string[] = [];
    let i = 0;

    while (i < text.length) {
      // Skip double-quoted strings
      if (text[i] === '"') {
        chars.push('"');
        i++;
        while (i < text.length) {
          if (text[i] === '\\' && i + 1 < text.length) {
            chars.push(text[i], text[i + 1]);
            i += 2;
            continue;
          }
          if (text[i] === '"') {
            chars.push('"');
            i++;
            break;
          }
          chars.push(text[i]);
          i++;
        }
        continue;
      }

      // Skip single-quoted strings
      if (text[i] === "'") {
        chars.push("'");
        i++;
        while (i < text.length) {
          if (text[i] === '\\' && i + 1 < text.length) {
            chars.push(text[i], text[i + 1]);
            i += 2;
            continue;
          }
          if (text[i] === "'") {
            chars.push("'");
            i++;
            break;
          }
          chars.push(text[i]);
          i++;
        }
        continue;
      }

      // Check for regex literal: `/` preceded by `:`, `,`, `[`, or `(`
      if (text[i] === '/') {
        // Find last non-whitespace char in output
        let lastNonWs = '';
        for (let j = chars.length - 1; j >= 0; j--) {
          if (!/\s/.test(chars[j])) {
            lastNonWs = chars[j];
            break;
          }
        }
        if (lastNonWs === ':' || lastNonWs === ',' || lastNonWs === '[' || lastNonWs === '(') {
          // Capture pattern until next unescaped `/`
          i++;
          let pattern = '';
          let regexEscaped = false;
          while (i < text.length) {
            if (regexEscaped) {
              pattern += text[i];
              regexEscaped = false;
              i++;
              continue;
            }
            if (text[i] === '\\') {
              pattern += text[i];
              regexEscaped = true;
              i++;
              continue;
            }
            if (text[i] === '/') {
              i++;
              break;
            }
            pattern += text[i];
            i++;
          }
          // Capture flags
          let flags = '';
          while (i < text.length && /[gimsuvy]/.test(text[i])) {
            flags += text[i];
            i++;
          }
          chars.push(
            `{"$regex": ${JSON.stringify(pattern)}, "$options": ${JSON.stringify(flags)}}`
          );
          continue;
        }
      }

      chars.push(text[i]);
      i++;
    }

    return chars.join('');
  }

  /**
   * Replace single-quoted strings with double-quoted strings,
   * handling escaped quotes inside.
   */
  private replaceSingleQuotes(text: string): string {
    const chars: string[] = [];
    let i = 0;

    while (i < text.length) {
      if (text[i] === '"') {
        // Skip double-quoted string entirely
        chars.push('"');
        i++;
        while (i < text.length) {
          if (text[i] === '\\' && i + 1 < text.length) {
            chars.push(text[i], text[i + 1]);
            i += 2;
            continue;
          }
          if (text[i] === '"') {
            chars.push('"');
            i++;
            break;
          }
          chars.push(text[i]);
          i++;
        }
      } else if (text[i] === "'") {
        // Convert single-quoted string to double-quoted
        chars.push('"');
        i++;
        while (i < text.length) {
          if (text[i] === '\\' && i + 1 < text.length) {
            chars.push(text[i], text[i + 1]);
            i += 2;
            continue;
          }
          if (text[i] === "'") {
            chars.push('"');
            i++;
            break;
          }
          // Escape any unescaped double quotes inside single-quoted string
          if (text[i] === '"') {
            chars.push('\\"');
            i++;
            continue;
          }
          chars.push(text[i]);
          i++;
        }
      } else {
        chars.push(text[i]);
        i++;
      }
    }

    return chars.join('');
  }
}

export const queryExecutor = new QueryExecutor();
