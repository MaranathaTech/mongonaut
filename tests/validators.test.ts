import { describe, it, expect } from 'vitest'
import { assertDbName, assertCollectionName, assertFieldName } from '../src/main/lib/validators'

describe('assertDbName', () => {
  it('accepts valid database names', () => {
    expect(() => assertDbName('mydb')).not.toThrow()
    expect(() => assertDbName('app_db')).not.toThrow()
    expect(() => assertDbName('db-1')).not.toThrow()
  })

  it('rejects empty string', () => {
    expect(() => assertDbName('')).toThrow('Invalid database name: empty')
  })

  it('rejects names with spaces', () => {
    expect(() => assertDbName('has space')).toThrow('contains illegal characters')
  })

  it('rejects names with dots', () => {
    expect(() => assertDbName('has.dot')).toThrow('contains illegal characters')
  })

  it('rejects names with forward slash', () => {
    expect(() => assertDbName('has/slash')).toThrow('contains illegal characters')
  })

  it('rejects names with backslash', () => {
    expect(() => assertDbName('has\\backslash')).toThrow('contains illegal characters')
  })

  it('rejects names with dollar sign', () => {
    expect(() => assertDbName('has$dollar')).toThrow('contains illegal characters')
  })

  it('rejects names with NUL byte', () => {
    expect(() => assertDbName('has\0null')).toThrow('contains illegal characters')
  })

  it('rejects names exceeding 63 characters', () => {
    expect(() => assertDbName('a'.repeat(64))).toThrow('exceeds 63 characters')
  })

  it('accepts names at exactly 63 characters', () => {
    expect(() => assertDbName('a'.repeat(63))).not.toThrow()
  })

  it('rejects non-string: number', () => {
    expect(() => assertDbName(123)).toThrow('expected string')
  })

  it('rejects non-string: null', () => {
    expect(() => assertDbName(null)).toThrow('expected string')
  })

  it('rejects non-string: undefined', () => {
    expect(() => assertDbName(undefined)).toThrow('expected string')
  })

  it('rejects non-string: object', () => {
    expect(() => assertDbName({})).toThrow('expected string')
  })

  it('rejects non-string: array', () => {
    expect(() => assertDbName([])).toThrow('expected string')
  })
})

describe('assertCollectionName', () => {
  it('accepts valid collection names', () => {
    expect(() => assertCollectionName('users')).not.toThrow()
    expect(() => assertCollectionName('my_coll')).not.toThrow()
  })

  it('accepts collection names with dots (dots are legal)', () => {
    expect(() => assertCollectionName('with.dots.ok')).not.toThrow()
  })

  it('rejects empty string', () => {
    expect(() => assertCollectionName('')).toThrow('Invalid collection name: empty')
  })

  it('rejects system.indexes', () => {
    expect(() => assertCollectionName('system.indexes')).toThrow('"system." prefix is not allowed')
  })

  it('rejects system.users', () => {
    expect(() => assertCollectionName('system.users')).toThrow('"system." prefix is not allowed')
  })

  it('rejects names starting with $', () => {
    expect(() => assertCollectionName('$cmd')).toThrow('cannot start with "$"')
  })

  it('rejects names with NUL byte', () => {
    expect(() => assertCollectionName('has\0null')).toThrow('contains NUL byte')
  })

  it('rejects names exceeding 120 characters', () => {
    expect(() => assertCollectionName('a'.repeat(121))).toThrow('exceeds 120 characters')
  })

  it('accepts names at exactly 120 characters', () => {
    expect(() => assertCollectionName('a'.repeat(120))).not.toThrow()
  })

  it('rejects non-string: number', () => {
    expect(() => assertCollectionName(123)).toThrow('expected string')
  })

  it('rejects non-string: null', () => {
    expect(() => assertCollectionName(null)).toThrow('expected string')
  })

  it('rejects non-string: undefined', () => {
    expect(() => assertCollectionName(undefined)).toThrow('expected string')
  })

  it('rejects non-string: object', () => {
    expect(() => assertCollectionName({})).toThrow('expected string')
  })

  it('rejects non-string: array', () => {
    expect(() => assertCollectionName([])).toThrow('expected string')
  })
})

describe('assertFieldName', () => {
  it('accepts valid field names', () => {
    expect(() => assertFieldName('name')).not.toThrow()
    expect(() => assertFieldName('address.street')).not.toThrow()
  })

  it('accepts field names with dollar signs (legal in some contexts)', () => {
    expect(() => assertFieldName('$id')).not.toThrow()
  })

  it('rejects empty string', () => {
    expect(() => assertFieldName('')).toThrow('Invalid field name: empty')
  })

  it('rejects names with NUL byte', () => {
    expect(() => assertFieldName('has\0null')).toThrow('contains NUL byte')
  })

  it('rejects names exceeding 1024 characters', () => {
    expect(() => assertFieldName('a'.repeat(1025))).toThrow('exceeds 1024 characters')
  })

  it('accepts names at exactly 1024 characters', () => {
    expect(() => assertFieldName('a'.repeat(1024))).not.toThrow()
  })

  it('rejects non-string: number', () => {
    expect(() => assertFieldName(123)).toThrow('expected string')
  })

  it('rejects non-string: null', () => {
    expect(() => assertFieldName(null)).toThrow('expected string')
  })

  it('rejects non-string: undefined', () => {
    expect(() => assertFieldName(undefined)).toThrow('expected string')
  })

  it('rejects non-string: object', () => {
    expect(() => assertFieldName({})).toThrow('expected string')
  })

  it('rejects non-string: array', () => {
    expect(() => assertFieldName([])).toThrow('expected string')
  })
})
