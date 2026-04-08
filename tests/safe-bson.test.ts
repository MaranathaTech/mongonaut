import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';

// Mock the bson module's EJSON
vi.mock('bson', () => {
  const EJSON = {
    stringify: (value: unknown, _options?: { relaxed?: boolean }) => {
      // Simplified EJSON.stringify for testing
      return JSON.stringify(value, (_, v) => {
        if (v && typeof v === 'object') {
          if (v._bsontype === 'ObjectId' || v._bsontype === 'ObjectID') {
            return { $oid: v.toString() };
          }
          if (v instanceof Date) {
            return { $date: v.toISOString() };
          }
        }
        return v;
      });
    },
    parse: (text: string, _options?: { relaxed?: boolean }) => {
      return JSON.parse(text);
    }
  };
  return { EJSON };
});

const { serializeDocuments, serializeDocument, deserializeDocument } =
  await import('../src/main/lib/safe-bson');

describe('Safe BSON', () => {
  describe('serializeDocuments', () => {
    it('should serialize a list of simple documents', () => {
      const docs = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 }
      ];
      const result = serializeDocuments(docs);
      expect(result).toEqual([
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 }
      ]);
    });

    it('should serialize nested documents', () => {
      const docs = [{ user: { name: 'Alice', address: { city: 'NYC' } } }];
      const result = serializeDocuments(docs);
      expect(result).toEqual([{ user: { name: 'Alice', address: { city: 'NYC' } } }]);
    });

    it('should serialize arrays with mixed types', () => {
      const docs = [{ tags: ['a', 1, true, null, { nested: 'obj' }] }];
      const result = serializeDocuments(docs);
      expect(result).toEqual([{ tags: ['a', 1, true, null, { nested: 'obj' }] }]);
    });

    it('should serialize an empty array', () => {
      const result = serializeDocuments([]);
      expect(result).toEqual([]);
    });
  });

  describe('serializeDocument', () => {
    it('should serialize a single document', () => {
      const doc = { name: 'Alice', age: 30 };
      const result = serializeDocument(doc);
      expect(result).toEqual({ name: 'Alice', age: 30 });
    });

    it('should handle null and boolean values', () => {
      const doc = { active: true, deleted: false, email: null };
      const result = serializeDocument(doc);
      expect(result).toEqual({ active: true, deleted: false, email: null });
    });
  });

  describe('deserializeDocument', () => {
    it('should deserialize a simple document', () => {
      const doc = { name: 'Alice', age: 30 };
      const result = deserializeDocument(doc);
      expect(result).toEqual({ name: 'Alice', age: 30 });
    });

    it('should round-trip serialize and deserialize', () => {
      const original = { name: 'Alice', scores: [95, 87, 92], active: true };
      const serialized = serializeDocument(original);
      const deserialized = deserializeDocument(serialized);
      expect(deserialized).toEqual(original);
    });
  });
});
