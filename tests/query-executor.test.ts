import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';

vi.mock('../src/main/services/connection-manager', () => ({
  connectionManager: {
    getClient: vi.fn()
  }
}));

const {
  queryExecutor,
  findMatchingParen,
  sanitizeFilter
} = await import('../src/main/services/query-executor');

// Helper to access private parseQuery for testing
const parseQuery = (text: string) => (queryExecutor as any).parseQuery(text);

describe('QueryExecutor - safeParseJSON', () => {
  it('should parse simple JSON object', () => {
    const result = queryExecutor.safeParseJSON('{name: "test"}');
    expect(result).toEqual({ name: 'test' });
  });

  it('should parse JSON with quoted keys', () => {
    const result = queryExecutor.safeParseJSON('{"name": "test"}');
    expect(result).toEqual({ name: 'test' });
  });

  it('should parse single-quoted values', () => {
    const result = queryExecutor.safeParseJSON("{'name': 'test'}");
    expect(result).toEqual({ name: 'test' });
  });

  it('should parse nested objects', () => {
    const result = queryExecutor.safeParseJSON('{address: {city: "NYC", zip: "10001"}}');
    expect(result).toEqual({ address: { city: 'NYC', zip: '10001' } });
  });

  it('should handle trailing commas', () => {
    const result = queryExecutor.safeParseJSON('{name: "test", age: 25,}');
    expect(result).toEqual({ name: 'test', age: 25 });
  });

  it('should parse ObjectId constructor', () => {
    const result = queryExecutor.safeParseJSON('{_id: ObjectId("507f1f77bcf86cd799439011")}');
    expect(result).toEqual({ _id: { $oid: '507f1f77bcf86cd799439011' } });
  });

  it('should parse ISODate constructor', () => {
    const result = queryExecutor.safeParseJSON('{createdAt: ISODate("2024-01-01T00:00:00Z")}');
    expect(result).toEqual({ createdAt: { $date: '2024-01-01T00:00:00Z' } });
  });

  it('should parse new Date constructor', () => {
    const result = queryExecutor.safeParseJSON('{createdAt: new Date("2024-01-01")}');
    expect(result).toEqual({ createdAt: { $date: '2024-01-01' } });
  });

  it('should parse NumberLong constructor', () => {
    const result = queryExecutor.safeParseJSON('{count: NumberLong("12345678901234")}');
    expect(result).toEqual({ count: { $numberLong: '12345678901234' } });
  });

  it('should parse NumberDecimal constructor', () => {
    const result = queryExecutor.safeParseJSON('{price: NumberDecimal("9.99")}');
    expect(result).toEqual({ price: { $numberDecimal: '9.99' } });
  });

  it('should parse Timestamp constructor', () => {
    const result = queryExecutor.safeParseJSON('{ts: Timestamp(1234567890, 1)}');
    expect(result).toEqual({ ts: { $timestamp: { t: 1234567890, i: 1 } } });
  });

  it('should parse arrays', () => {
    const result = queryExecutor.safeParseJSON(
      '[{$match: {status: "active"}}, {$group: {_id: "$field"}}]'
    );
    expect(result).toEqual([{ $match: { status: 'active' } }, { $group: { _id: '$field' } }]);
  });

  it('should parse $-prefixed operators', () => {
    const result = queryExecutor.safeParseJSON('{age: {$gt: 18, $lt: 65}}');
    expect(result).toEqual({ age: { $gt: 18, $lt: 65 } });
  });

  it('should handle boolean values', () => {
    const result = queryExecutor.safeParseJSON('{active: true, deleted: false}');
    expect(result).toEqual({ active: true, deleted: false });
  });

  it('should handle null values', () => {
    const result = queryExecutor.safeParseJSON('{email: null}');
    expect(result).toEqual({ email: null });
  });

  it('should throw on invalid JSON', () => {
    expect(() => queryExecutor.safeParseJSON('not valid json')).toThrow();
  });

  it('should parse dot-notation field names', () => {
    const result = queryExecutor.safeParseJSON('{"address.city": "NYC"}');
    expect(result).toEqual({ 'address.city': 'NYC' });
  });

  it('should parse empty object', () => {
    const result = queryExecutor.safeParseJSON('{}');
    expect(result).toEqual({});
  });

  it('should parse empty array', () => {
    const result = queryExecutor.safeParseJSON('[]');
    expect(result).toEqual([]);
  });
});

describe('findMatchingParen', () => {
  it('should find matching paren in simple case', () => {
    expect(findMatchingParen('(abc)', 0)).toBe(4);
  });

  it('should handle nested parens', () => {
    expect(findMatchingParen('(a(b)c)', 0)).toBe(6);
  });

  it('should handle parens inside strings', () => {
    expect(findMatchingParen('("a)")', 0)).toBe(5);
  });

  it('should throw on unbalanced parens', () => {
    expect(() => findMatchingParen('(abc', 0)).toThrow('Unbalanced parentheses');
  });

  it('should throw when not starting at opening paren', () => {
    expect(() => findMatchingParen('abc', 0)).toThrow('Expected opening paren');
  });
});

describe('QueryExecutor - parser correctness', () => {
  it('should parse find with sort, limit chain', () => {
    const result = parseQuery('db.col.find({a:1}).sort({b:-1}).limit(10)');
    expect(result.method).toBe('find');
    expect(result.filter).toEqual({ a: 1 });
    expect(result.sort).toEqual({ b: -1 });
    expect(result.limit).toBe(10);
  });

  it('should parse chain args with nested parens', () => {
    const result = parseQuery(
      'db.col.find({a: {$gt: 1}}).sort({nested: {$meta: "textScore"}})'
    );
    expect(result.method).toBe('find');
    expect(result.filter).toEqual({ a: { $gt: 1 } });
    expect(result.sort).toEqual({ nested: { $meta: 'textScore' } });
  });

  it('should parse regex literal with double-quote inside', () => {
    const result = queryExecutor.safeParseJSON('{name: /foo"bar/}');
    expect(result).toEqual({ name: { $regex: 'foo"bar', $options: '' } });
  });

  it('should NOT rewrite forward slashes inside string literals as regex', () => {
    const result = queryExecutor.safeParseJSON('{url: "https://example.com/path"}');
    expect(result).toEqual({ url: 'https://example.com/path' });
  });

  it('should parse find with skip and project chain', () => {
    const result = parseQuery('db.col.find({}).skip(20).limit(10).project({name: 1})');
    expect(result.method).toBe('find');
    expect(result.skip).toBe(20);
    expect(result.limit).toBe(10);
    expect(result.projection).toEqual({ name: 1 });
  });

  it('should parse implicit find', () => {
    const result = parseQuery('{status: "active"}');
    expect(result.method).toBe('find');
    expect(result.filter).toEqual({ status: 'active' });
  });

  it('should parse implicit aggregate', () => {
    const result = parseQuery('[{$match: {status: "active"}}]');
    expect(result.method).toBe('aggregate');
    expect(result.pipeline).toEqual([{ $match: { status: 'active' } }]);
  });
});

describe('QueryExecutor - getCollection and bracket notation', () => {
  it('should parse db.getCollection("my-collection").find({})', () => {
    const result = parseQuery('db.getCollection("my-collection").find({})');
    expect(result.method).toBe('find');
    expect(result.filter).toEqual({});
  });

  it('should parse db.getCollection with single quotes', () => {
    const result = parseQuery("db.getCollection('my.collection').find({status: 'active'})");
    expect(result.method).toBe('find');
    expect(result.filter).toEqual({ status: 'active' });
  });

  it('should parse bracket notation db["name"].find({})', () => {
    const result = parseQuery('db["my-collection"].find({})');
    expect(result.method).toBe('find');
    expect(result.filter).toEqual({});
  });

  it('should parse bracket notation with single quotes', () => {
    const result = parseQuery("db['my.collection'].find({name: 'test'})");
    expect(result.method).toBe('find');
    expect(result.filter).toEqual({ name: 'test' });
  });

  it('should parse getCollection with chaining', () => {
    const result = parseQuery(
      'db.getCollection("my-collection").find({a: 1}).sort({b: -1}).limit(10)'
    );
    expect(result.method).toBe('find');
    expect(result.filter).toEqual({ a: 1 });
    expect(result.sort).toEqual({ b: -1 });
    expect(result.limit).toBe(10);
  });

  it('should parse getCollection with aggregate', () => {
    const result = parseQuery(
      'db.getCollection("events-log").aggregate([{$match: {type: "click"}}])'
    );
    expect(result.method).toBe('aggregate');
    expect(result.pipeline).toEqual([{ $match: { type: 'click' } }]);
  });

  it('should parse bracket notation with aggregate', () => {
    const result = parseQuery(
      'db["events.log"].aggregate([{$group: {_id: "$type", count: {$sum: 1}}}])'
    );
    expect(result.method).toBe('aggregate');
    expect(result.pipeline).toEqual([{ $group: { _id: '$type', count: { $sum: 1 } } }]);
  });

  it('should parse getCollection with countDocuments', () => {
    const result = parseQuery('db.getCollection("my-coll").countDocuments({active: true})');
    expect(result.method).toBe('countDocuments');
    expect(result.filter).toEqual({ active: true });
  });
});

describe('sanitizeFilter', () => {
  it('should reject $where operator', () => {
    expect(() => sanitizeFilter({ $where: 'this.a == 1' })).toThrow(
      'Operator "$where" is not allowed'
    );
  });

  it('should reject $function operator', () => {
    expect(() =>
      sanitizeFilter({ $function: { body: 'function() {}', args: [], lang: 'js' } })
    ).toThrow('Operator "$function" is not allowed');
  });

  it('should reject $accumulator operator', () => {
    expect(() =>
      sanitizeFilter({ $accumulator: { init: 'function() {}', accumulate: 'function() {}' } })
    ).toThrow('Operator "$accumulator" is not allowed');
  });

  it('should accept $expr with safe operators', () => {
    expect(() => sanitizeFilter({ $expr: { $eq: ['$a', '$b'] } })).not.toThrow();
  });

  it('should reject forbidden operator nested inside $expr', () => {
    expect(() =>
      sanitizeFilter({
        $expr: { $function: { body: 'function() {}', args: [], lang: 'js' } }
      })
    ).toThrow('Operator "$function" is not allowed');
  });

  it('should reject $where in aggregate pipeline stage', () => {
    const pipeline = [{ $match: { $where: 'this.a > 1' } }];
    expect(() => {
      for (const stage of pipeline) sanitizeFilter(stage);
    }).toThrow('Operator "$where" is not allowed');
  });

  it('should accept normal filter objects', () => {
    expect(() => sanitizeFilter({ name: 'test', age: { $gt: 18 } })).not.toThrow();
  });

  it('should accept null and primitives', () => {
    expect(() => sanitizeFilter(null)).not.toThrow();
    expect(() => sanitizeFilter(42)).not.toThrow();
    expect(() => sanitizeFilter('hello')).not.toThrow();
  });
});

describe('QueryExecutor - error message sanitization', () => {
  it('should not include "Processed" in parse error messages', () => {
    try {
      queryExecutor.safeParseJSON('not valid json at all');
      expect.fail('Expected an error to be thrown');
    } catch (err) {
      const message = (err as Error).message;
      expect(message).not.toContain('Processed');
      expect(message).not.toContain('not valid json');
      expect(message).toMatch(/^Failed to parse query/);
    }
  });

  it('should not leak rewritten text in error messages', () => {
    try {
      queryExecutor.safeParseJSON('{broken: value without quotes}');
      expect.fail('Expected an error to be thrown');
    } catch (err) {
      const message = (err as Error).message;
      expect(message).not.toContain('Processed text');
      expect(message).toMatch(/^Failed to parse query/);
    }
  });
});
