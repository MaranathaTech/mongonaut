import { describe, it, expect } from 'vitest'

// We test the query parsing logic directly by importing the QueryExecutor class
// and calling its public safeParseJSON + testing the parse behavior.
// Since QueryExecutor is a class with private parseQuery, we test through safeParseJSON
// and exercise parseQuery via a test-friendly approach.

// Import the module - since it's a class we can test the parsing methods
// We need to mock the connectionManager since it's imported at module level
import { vi } from 'vitest'

vi.mock('../src/main/services/connection-manager', () => ({
  connectionManager: {
    getClient: vi.fn()
  }
}))

// Now import the query executor
const { queryExecutor } = await import('../src/main/services/query-executor')

describe('QueryExecutor - safeParseJSON', () => {
  it('should parse simple JSON object', () => {
    const result = queryExecutor.safeParseJSON('{name: "test"}')
    expect(result).toEqual({ name: 'test' })
  })

  it('should parse JSON with quoted keys', () => {
    const result = queryExecutor.safeParseJSON('{"name": "test"}')
    expect(result).toEqual({ name: 'test' })
  })

  it('should parse single-quoted values', () => {
    const result = queryExecutor.safeParseJSON("{'name': 'test'}")
    expect(result).toEqual({ name: 'test' })
  })

  it('should parse nested objects', () => {
    const result = queryExecutor.safeParseJSON('{address: {city: "NYC", zip: "10001"}}')
    expect(result).toEqual({ address: { city: 'NYC', zip: '10001' } })
  })

  it('should handle trailing commas', () => {
    const result = queryExecutor.safeParseJSON('{name: "test", age: 25,}')
    expect(result).toEqual({ name: 'test', age: 25 })
  })

  it('should parse ObjectId constructor', () => {
    const result = queryExecutor.safeParseJSON('{_id: ObjectId("507f1f77bcf86cd799439011")}')
    expect(result).toEqual({ _id: { $oid: '507f1f77bcf86cd799439011' } })
  })

  it('should parse ISODate constructor', () => {
    const result = queryExecutor.safeParseJSON('{createdAt: ISODate("2024-01-01T00:00:00Z")}')
    expect(result).toEqual({ createdAt: { $date: '2024-01-01T00:00:00Z' } })
  })

  it('should parse new Date constructor', () => {
    const result = queryExecutor.safeParseJSON('{createdAt: new Date("2024-01-01")}')
    expect(result).toEqual({ createdAt: { $date: '2024-01-01' } })
  })

  it('should parse NumberLong constructor', () => {
    const result = queryExecutor.safeParseJSON('{count: NumberLong("12345678901234")}')
    expect(result).toEqual({ count: { $numberLong: '12345678901234' } })
  })

  it('should parse NumberDecimal constructor', () => {
    const result = queryExecutor.safeParseJSON('{price: NumberDecimal("9.99")}')
    expect(result).toEqual({ price: { $numberDecimal: '9.99' } })
  })

  it('should parse Timestamp constructor', () => {
    const result = queryExecutor.safeParseJSON('{ts: Timestamp(1234567890, 1)}')
    expect(result).toEqual({ ts: { $timestamp: { t: 1234567890, i: 1 } } })
  })

  it('should parse arrays', () => {
    const result = queryExecutor.safeParseJSON('[{$match: {status: "active"}}, {$group: {_id: "$field"}}]')
    expect(result).toEqual([
      { $match: { status: 'active' } },
      { $group: { _id: '$field' } }
    ])
  })

  it('should parse $-prefixed operators', () => {
    const result = queryExecutor.safeParseJSON('{age: {$gt: 18, $lt: 65}}')
    expect(result).toEqual({ age: { $gt: 18, $lt: 65 } })
  })

  it('should handle boolean values', () => {
    const result = queryExecutor.safeParseJSON('{active: true, deleted: false}')
    expect(result).toEqual({ active: true, deleted: false })
  })

  it('should handle null values', () => {
    const result = queryExecutor.safeParseJSON('{email: null}')
    expect(result).toEqual({ email: null })
  })

  it('should throw on invalid JSON', () => {
    expect(() => queryExecutor.safeParseJSON('not valid json')).toThrow()
  })

  it('should parse dot-notation field names', () => {
    const result = queryExecutor.safeParseJSON('{"address.city": "NYC"}')
    expect(result).toEqual({ 'address.city': 'NYC' })
  })

  it('should parse empty object', () => {
    const result = queryExecutor.safeParseJSON('{}')
    expect(result).toEqual({})
  })

  it('should parse empty array', () => {
    const result = queryExecutor.safeParseJSON('[]')
    expect(result).toEqual([])
  })
})
