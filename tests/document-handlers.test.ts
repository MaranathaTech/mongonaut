import { describe, it, expect } from 'vitest';
import { assertSafeDocumentId, assertNoTopLevelOperators } from '../src/main/ipc/document-validators';

describe('assertSafeDocumentId', () => {
  describe('accepted _id shapes', () => {
    it('should accept a string', () => {
      expect(() => assertSafeDocumentId('abc123')).not.toThrow();
    });

    it('should accept a number', () => {
      expect(() => assertSafeDocumentId(42)).not.toThrow();
    });

    it('should accept null', () => {
      expect(() => assertSafeDocumentId(null)).not.toThrow();
    });

    it('should accept a boolean', () => {
      expect(() => assertSafeDocumentId(true)).not.toThrow();
      expect(() => assertSafeDocumentId(false)).not.toThrow();
    });

    it('should accept $oid wrapper', () => {
      expect(() => assertSafeDocumentId({ $oid: '507f1f77bcf86cd799439011' })).not.toThrow();
    });

    it('should accept $date wrapper', () => {
      expect(() => assertSafeDocumentId({ $date: '2024-01-01T00:00:00Z' })).not.toThrow();
    });

    it('should accept $numberLong wrapper', () => {
      expect(() => assertSafeDocumentId({ $numberLong: '9007199254740993' })).not.toThrow();
    });

    it('should accept $uuid wrapper', () => {
      expect(() =>
        assertSafeDocumentId({ $uuid: 'b0f8a6e0-1234-5678-9abc-def012345678' })
      ).not.toThrow();
    });

    it('should accept $numberDecimal wrapper', () => {
      expect(() => assertSafeDocumentId({ $numberDecimal: '9.99' })).not.toThrow();
    });

    it('should accept $numberDouble wrapper', () => {
      expect(() => assertSafeDocumentId({ $numberDouble: '1.5' })).not.toThrow();
    });

    it('should accept $numberInt wrapper', () => {
      expect(() => assertSafeDocumentId({ $numberInt: '42' })).not.toThrow();
    });

    it('should accept $binary wrapper', () => {
      expect(() =>
        assertSafeDocumentId({ $binary: { base64: 'AQID', subType: '00' } })
      ).not.toThrow();
    });

    it('should accept $timestamp wrapper', () => {
      expect(() => assertSafeDocumentId({ $timestamp: { t: 123, i: 1 } })).not.toThrow();
    });

    it('should accept $regularExpression wrapper', () => {
      expect(() =>
        assertSafeDocumentId({ $regularExpression: { pattern: 'abc', options: 'i' } })
      ).not.toThrow();
    });

    it('should accept $minKey wrapper', () => {
      expect(() => assertSafeDocumentId({ $minKey: 1 })).not.toThrow();
    });

    it('should accept $maxKey wrapper', () => {
      expect(() => assertSafeDocumentId({ $maxKey: 1 })).not.toThrow();
    });

    it('should accept $symbol wrapper', () => {
      expect(() => assertSafeDocumentId({ $symbol: 'foo' })).not.toThrow();
    });

    it('should accept $code wrapper', () => {
      expect(() => assertSafeDocumentId({ $code: 'function() {}' })).not.toThrow();
    });
  });

  describe('rejected _id shapes', () => {
    it('should reject $ne operator', () => {
      expect(() => assertSafeDocumentId({ $ne: null })).toThrow(
        'Invalid document id: operator "$ne" not allowed'
      );
    });

    it('should reject $exists operator', () => {
      expect(() => assertSafeDocumentId({ $exists: true })).toThrow(
        'Invalid document id: operator "$exists" not allowed'
      );
    });

    it('should reject $gt operator', () => {
      expect(() => assertSafeDocumentId({ $gt: '' })).toThrow(
        'Invalid document id: operator "$gt" not allowed'
      );
    });

    it('should reject mixed keys with an operator', () => {
      expect(() => assertSafeDocumentId({ name: 'foo', $ne: null })).toThrow(
        'Invalid document id: operator "$ne" not allowed'
      );
    });

    it('should reject operator hidden inside a type wrapper value', () => {
      expect(() => assertSafeDocumentId({ $oid: { $ne: null } })).toThrow(
        'Invalid document id: operator "$ne" not allowed'
      );
    });

    it('should reject an array', () => {
      expect(() => assertSafeDocumentId([])).toThrow(
        'Invalid document id: must be a scalar or EJSON type wrapper object'
      );
    });

    it('should reject an empty object', () => {
      expect(() => assertSafeDocumentId({})).toThrow('Invalid document id: empty object');
    });

    it('should reject $where operator', () => {
      expect(() => assertSafeDocumentId({ $where: 'this.a > 1' })).toThrow(
        'Invalid document id: operator "$where" not allowed'
      );
    });

    it('should reject $regex operator', () => {
      expect(() => assertSafeDocumentId({ $regex: '.*' })).toThrow(
        'Invalid document id: operator "$regex" not allowed'
      );
    });

    it('should reject deeply nested operators', () => {
      expect(() =>
        assertSafeDocumentId({ $oid: { nested: { $gt: 1 } } })
      ).toThrow('Invalid document id: operator "$gt" not allowed');
    });

    it('should reject operator inside array value', () => {
      expect(() =>
        assertSafeDocumentId({ $binary: [{ $ne: null }] })
      ).toThrow('Invalid document id: operator "$ne" not allowed');
    });
  });
});

describe('assertNoTopLevelOperators', () => {
  describe('accepted payloads', () => {
    it('should accept a plain document', () => {
      expect(() => assertNoTopLevelOperators({ name: 'foo', age: 30 }, 'Test')).not.toThrow();
    });

    it('should accept nested $ keys inside values', () => {
      expect(() =>
        assertNoTopLevelOperators({ nested: { $oid: '507f1f77bcf86cd799439011' } }, 'Test')
      ).not.toThrow();
    });

    it('should accept an empty object', () => {
      expect(() => assertNoTopLevelOperators({}, 'Test')).not.toThrow();
    });

    it('should accept _id field', () => {
      expect(() =>
        assertNoTopLevelOperators({ _id: { $oid: '507f1f77bcf86cd799439011' }, name: 'foo' }, 'Test')
      ).not.toThrow();
    });
  });

  describe('rejected payloads', () => {
    it('should reject $set at top level', () => {
      expect(() => assertNoTopLevelOperators({ $set: { name: 'foo' } }, 'Test')).toThrow(
        'Test: top-level key "$set" is not allowed'
      );
    });

    it('should reject $inc at top level', () => {
      expect(() => assertNoTopLevelOperators({ $inc: { age: 1 } }, 'Test')).toThrow(
        'Test: top-level key "$inc" is not allowed'
      );
    });

    it('should reject $unset at top level', () => {
      expect(() => assertNoTopLevelOperators({ $unset: { field: '' } }, 'Test')).toThrow(
        'Test: top-level key "$unset" is not allowed'
      );
    });

    it('should reject an array', () => {
      expect(() => assertNoTopLevelOperators([], 'Test')).toThrow('Test: expected an object');
    });

    it('should reject null', () => {
      expect(() => assertNoTopLevelOperators(null, 'Test')).toThrow('Test: expected an object');
    });

    it('should reject a string', () => {
      expect(() => assertNoTopLevelOperators('string', 'Test')).toThrow(
        'Test: expected an object'
      );
    });

    it('should reject a number', () => {
      expect(() => assertNoTopLevelOperators(42, 'Test')).toThrow('Test: expected an object');
    });
  });
});
