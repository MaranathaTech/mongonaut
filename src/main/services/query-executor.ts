import type { Sort } from 'mongodb';
import { connectionManager } from './connection-manager';
import { serializeDocuments, serializeDocument } from '../lib/safe-bson';
import type { QueryRequest, QueryResult } from '../../shared/types';

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

    // Try db.collection.method(...) pattern
    // Match: db.<anything>.method( ... ) with optional chained calls
    const dbMethodMatch = text.match(/^db\.\w+\.(\w+)\s*\(([\s\S]*)\)\s*(.*)$/s);
    if (dbMethodMatch) {
      const method = dbMethodMatch[1];
      const argsStr = dbMethodMatch[2];
      const chainStr = dbMethodMatch[3];
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

    // Parse chained methods: .sort({}).limit(N).skip(N).project({})
    if (chainStr) {
      const chainMethods = chainStr.matchAll(/\.(\w+)\(([^)]*)\)/g);
      for (const match of chainMethods) {
        const chainMethod = match[1];
        const chainArg = match[2].trim();
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
    // Simple regex: /pattern/flags → {"$regex": "pattern", "$options": "flags"}
    processed = processed.replace(/\/([^/\n]+)\/([gimsuvy]*)/g, (_match, pattern, flags) => {
      return `{"$regex": "${pattern}", "$options": "${flags}"}`;
    });

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
      throw new Error(
        `Failed to parse query: ${err instanceof Error ? err.message : String(err)}\nProcessed text: ${processed}`
      );
    }
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
