import { connectionManager } from './connection-manager';
import type { SchemaField } from '../../shared/types';

class SchemaSampler {
  private cache: Map<string, SchemaField[]> = new Map();

  async sampleSchema(database: string, collection: string): Promise<SchemaField[]> {
    const cacheKey = `${database}.${collection}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const client = connectionManager.getClient();
    const coll = client.db(database).collection(collection);

    // Sample up to 100 random documents
    const docs = await coll.aggregate([{ $sample: { size: 100 } }]).toArray();

    if (docs.length === 0) {
      const empty: SchemaField[] = [];
      this.cache.set(cacheKey, empty);
      return empty;
    }

    // Extract all field paths recursively
    const fieldMap = new Map<string, { types: Set<string>; count: number }>();

    for (const doc of docs) {
      extractFields(doc, '', fieldMap);
    }

    // Convert to SchemaField array
    const fields: SchemaField[] = [];
    for (const [path, info] of fieldMap) {
      fields.push({
        path,
        types: Array.from(info.types),
        frequency: info.count / docs.length
      });
    }

    // Sort by frequency (most common first)
    fields.sort((a, b) => b.frequency - a.frequency);

    this.cache.set(cacheKey, fields);
    return fields;
  }

  invalidateCache(database?: string, collection?: string): void {
    if (database && collection) {
      this.cache.delete(`${database}.${collection}`);
    } else {
      this.cache.clear();
    }
  }
}

function extractFields(
  obj: Record<string, unknown>,
  prefix: string,
  map: Map<string, { types: Set<string>; count: number }>
): void {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const type = getBsonType(value);

    if (!map.has(path)) {
      map.set(path, { types: new Set(), count: 0 });
    }
    const info = map.get(path)!;
    info.types.add(type);
    info.count++;

    // Recurse into nested objects (but not arrays, Dates, or BSON types)
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date) &&
      !(value as Record<string, unknown>)._bsontype
    ) {
      extractFields(value as Record<string, unknown>, path, map);
    }

    // For arrays, also extract field paths of array elements if they're objects
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          extractFields(item as Record<string, unknown>, path, map);
        }
      }
    }
  }
}

function getBsonType(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  const bsonObj = value as Record<string, unknown>;
  if (bsonObj._bsontype === 'ObjectId' || bsonObj._bsontype === 'ObjectID') return 'objectId';
  if (bsonObj._bsontype === 'Decimal128') return 'decimal128';
  if (bsonObj._bsontype === 'Long') return 'long';
  if (bsonObj._bsontype === 'Binary') return 'binary';
  if (bsonObj._bsontype === 'Timestamp') return 'timestamp';
  if (typeof value === 'object') return 'object';
  return typeof value; // string, number, boolean
}

export const schemaSampler = new SchemaSampler();
