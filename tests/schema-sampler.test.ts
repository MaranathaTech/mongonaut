import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'

// Mock the connection manager
const mockToArray = vi.fn()
const mockAggregate = vi.fn(() => ({ toArray: mockToArray }))
const mockCollection = vi.fn(() => ({ aggregate: mockAggregate }))
const mockDb = vi.fn(() => ({ collection: mockCollection }))

vi.mock('../src/main/services/connection-manager', () => ({
  connectionManager: {
    getClient: () => ({
      db: mockDb
    })
  }
}))

const { schemaSampler } = await import('../src/main/services/schema-sampler')

describe('SchemaSampler', () => {
  beforeEach(() => {
    schemaSampler.invalidateCache()
    mockToArray.mockReset()
    mockAggregate.mockClear()
    mockCollection.mockClear()
    mockDb.mockClear()
  })

  it('should extract flat fields from simple documents', async () => {
    mockToArray.mockResolvedValue([
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 }
    ])

    const fields = await schemaSampler.sampleSchema('testdb', 'users')

    expect(fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'name', types: ['string'], frequency: 1 }),
        expect.objectContaining({ path: 'age', types: ['number'], frequency: 1 })
      ])
    )
  })

  it('should extract nested field paths', async () => {
    mockToArray.mockResolvedValue([
      { address: { city: 'NYC', zip: '10001' } }
    ])

    const fields = await schemaSampler.sampleSchema('testdb', 'nested')

    const paths = fields.map((f) => f.path)
    expect(paths).toContain('address')
    expect(paths).toContain('address.city')
    expect(paths).toContain('address.zip')
  })

  it('should extract array element fields', async () => {
    mockToArray.mockResolvedValue([
      { tags: [{ label: 'important', priority: 1 }] }
    ])

    const fields = await schemaSampler.sampleSchema('testdb', 'arraydocs')

    const paths = fields.map((f) => f.path)
    expect(paths).toContain('tags')
    expect(paths).toContain('tags.label')
    expect(paths).toContain('tags.priority')
  })

  it('should detect correct types for each field', async () => {
    mockToArray.mockResolvedValue([
      { name: 'Alice', age: 30, active: true, email: null }
    ])

    const fields = await schemaSampler.sampleSchema('testdb', 'typed')

    const findField = (path: string) => fields.find((f) => f.path === path)

    expect(findField('name')?.types).toContain('string')
    expect(findField('age')?.types).toContain('number')
    expect(findField('active')?.types).toContain('boolean')
    expect(findField('email')?.types).toContain('null')
  })

  it('should calculate frequency correctly', async () => {
    mockToArray.mockResolvedValue([
      { name: 'Alice', age: 30 },
      { name: 'Bob' },
      { name: 'Charlie', age: 40 }
    ])

    const fields = await schemaSampler.sampleSchema('testdb', 'freq')

    const nameField = fields.find((f) => f.path === 'name')
    const ageField = fields.find((f) => f.path === 'age')

    expect(nameField?.frequency).toBe(1) // 3/3
    expect(ageField?.frequency).toBeCloseTo(2 / 3) // 2/3
  })

  it('should sort fields by frequency (most common first)', async () => {
    mockToArray.mockResolvedValue([
      { name: 'Alice', age: 30, rare: true },
      { name: 'Bob', age: 25 },
      { name: 'Charlie' }
    ])

    const fields = await schemaSampler.sampleSchema('testdb', 'sorted')

    // name appears in all 3, age in 2, rare in 1
    expect(fields[0].path).toBe('name')
    expect(fields[1].path).toBe('age')
    expect(fields[2].path).toBe('rare')
  })

  it('should handle empty collection', async () => {
    mockToArray.mockResolvedValue([])

    const fields = await schemaSampler.sampleSchema('testdb', 'empty')

    expect(fields).toEqual([])
  })

  it('should cache results', async () => {
    mockToArray.mockResolvedValue([{ name: 'Alice' }])

    await schemaSampler.sampleSchema('testdb', 'cached')
    await schemaSampler.sampleSchema('testdb', 'cached')

    // aggregate should only be called once due to caching
    expect(mockAggregate).toHaveBeenCalledTimes(1)
  })

  it('should invalidate cache for specific collection', async () => {
    mockToArray.mockResolvedValue([{ name: 'Alice' }])

    await schemaSampler.sampleSchema('testdb', 'invalidate')
    schemaSampler.invalidateCache('testdb', 'invalidate')
    await schemaSampler.sampleSchema('testdb', 'invalidate')

    expect(mockAggregate).toHaveBeenCalledTimes(2)
  })

  it('should detect array type', async () => {
    mockToArray.mockResolvedValue([
      { items: [1, 2, 3] }
    ])

    const fields = await schemaSampler.sampleSchema('testdb', 'arrays')
    const itemsField = fields.find((f) => f.path === 'items')
    expect(itemsField?.types).toContain('array')
  })

  it('should detect object type for nested docs', async () => {
    mockToArray.mockResolvedValue([
      { meta: { version: 1 } }
    ])

    const fields = await schemaSampler.sampleSchema('testdb', 'objects')
    const metaField = fields.find((f) => f.path === 'meta')
    expect(metaField?.types).toContain('object')
  })
})
