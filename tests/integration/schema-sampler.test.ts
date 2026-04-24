import { describe, it, expect } from 'vitest'
import { schemaSampler } from '../../src/main/services/schema-sampler'
import { setupTestMongo } from './test-utils'

const DB = 'test_schema_sampler'
const mongo = setupTestMongo(DB)

describe('SchemaSampler integration', () => {
  it('should extract field paths from documents', async () => {
    await mongo.seed('users', [
      { name: 'Alice', age: 30, email: 'alice@test.com' },
      { name: 'Bob', age: 25, email: 'bob@test.com' }
    ])

    // Clear cache to ensure fresh sampling
    schemaSampler.invalidateCache(DB, 'users')

    const fields = await schemaSampler.sampleSchema(DB, 'users')

    const paths = fields.map((f) => f.path)
    expect(paths).toContain('_id')
    expect(paths).toContain('name')
    expect(paths).toContain('age')
    expect(paths).toContain('email')
  })

  it('should detect correct types', async () => {
    await mongo.seed('typed', [
      { str: 'hello', num: 42, bool: true, arr: [1, 2], obj: { nested: true } }
    ])

    schemaSampler.invalidateCache(DB, 'typed')
    const fields = await schemaSampler.sampleSchema(DB, 'typed')

    const byPath = Object.fromEntries(fields.map((f) => [f.path, f]))

    expect(byPath['str'].types).toContain('string')
    expect(byPath['num'].types).toContain('number')
    expect(byPath['bool'].types).toContain('boolean')
    expect(byPath['arr'].types).toContain('array')
    expect(byPath['obj'].types).toContain('object')
  })

  it('should extract nested object fields', async () => {
    await mongo.seed('nested', [
      { address: { city: 'NYC', zip: '10001' } },
      { address: { city: 'LA', zip: '90001' } }
    ])

    schemaSampler.invalidateCache(DB, 'nested')
    const fields = await schemaSampler.sampleSchema(DB, 'nested')

    const paths = fields.map((f) => f.path)
    expect(paths).toContain('address')
    expect(paths).toContain('address.city')
    expect(paths).toContain('address.zip')
  })

  it('should calculate frequency correctly', async () => {
    await mongo.seed('freq', [
      { name: 'Alice', optional: 'present' },
      { name: 'Bob' },
      { name: 'Charlie', optional: 'present' }
    ])

    schemaSampler.invalidateCache(DB, 'freq')
    const fields = await schemaSampler.sampleSchema(DB, 'freq')

    const byPath = Object.fromEntries(fields.map((f) => [f.path, f]))

    // _id and name appear in all 3 documents
    expect(byPath['name'].frequency).toBeCloseTo(1.0)
    // optional appears in 2 of 3 documents
    expect(byPath['optional'].frequency).toBeCloseTo(2 / 3)
  })

  it('should return empty array for empty collection', async () => {
    // Create an empty collection by inserting and removing
    await mongo.seed('empty', [{ temp: true }])
    await mongo.db.collection('empty').deleteMany({})

    schemaSampler.invalidateCache(DB, 'empty')
    const fields = await schemaSampler.sampleSchema(DB, 'empty')

    expect(fields).toEqual([])
  })

  it('should use cache on second call', async () => {
    await mongo.seed('cached', [{ name: 'Alice' }])

    schemaSampler.invalidateCache(DB, 'cached')

    const first = await schemaSampler.sampleSchema(DB, 'cached')
    const second = await schemaSampler.sampleSchema(DB, 'cached')

    // Should return the same reference from cache
    expect(first).toBe(second)
  })

  it('should return fresh results after cache invalidation', async () => {
    await mongo.seed('evolving', [{ name: 'Alice' }])

    schemaSampler.invalidateCache(DB, 'evolving')
    const first = await schemaSampler.sampleSchema(DB, 'evolving')

    // Add a new field
    await mongo.db.collection('evolving').insertOne({ name: 'Bob', newField: 123 })

    // Without invalidation, should still return cached
    const cached = await schemaSampler.sampleSchema(DB, 'evolving')
    expect(cached).toBe(first)

    // After invalidation, should see new field
    schemaSampler.invalidateCache(DB, 'evolving')
    const refreshed = await schemaSampler.sampleSchema(DB, 'evolving')
    expect(refreshed).not.toBe(first)

    const paths = refreshed.map((f) => f.path)
    expect(paths).toContain('newField')
  })

  it('should handle mixed types in the same field', async () => {
    await mongo.seed('mixed', [
      { value: 'string' },
      { value: 42 },
      { value: true }
    ])

    schemaSampler.invalidateCache(DB, 'mixed')
    const fields = await schemaSampler.sampleSchema(DB, 'mixed')

    const valueField = fields.find((f) => f.path === 'value')
    expect(valueField).toBeDefined()
    expect(valueField!.types).toContain('string')
    expect(valueField!.types).toContain('number')
    expect(valueField!.types).toContain('boolean')
  })
})
