import { describe, it, expect } from 'vitest'
import { connectionManager } from '../../src/main/services/connection-manager'
import { setupTestMongo } from './test-utils'

const DB = 'test_database_listing'
const mongo = setupTestMongo(DB)

describe('Database listing integration', () => {
  describe('listDatabases', () => {
    it('should list databases including the test database', async () => {
      // Ensure the database exists by inserting a document
      await mongo.seed('probe', [{ _id: 'probe' }])

      const client = connectionManager.getClient()
      const result = await client.db('admin').admin().listDatabases()

      const dbNames = result.databases.map((db) => db.name)
      expect(dbNames).toContain(DB)
    })

    it('should include sizeOnDisk for each database', async () => {
      await mongo.seed('probe', [{ _id: 'probe' }])

      const client = connectionManager.getClient()
      const result = await client.db('admin').admin().listDatabases()

      const testDb = result.databases.find((db) => db.name === DB)
      expect(testDb).toBeDefined()
      expect(typeof testDb!.sizeOnDisk).toBe('number')
    })
  })

  describe('listCollections', () => {
    it('should list collections in a database', async () => {
      await mongo.seed('collection_a', [{ data: 1 }])
      await mongo.seed('collection_b', [{ data: 2 }])

      const client = connectionManager.getClient()
      const collections = await client.db(DB).listCollections().toArray()
      const names = collections.map((c) => c.name)

      expect(names).toContain('collection_a')
      expect(names).toContain('collection_b')
    })

    it('should return collection type', async () => {
      await mongo.seed('typed_col', [{ data: 1 }])

      const client = connectionManager.getClient()
      const collections = await client.db(DB).listCollections().toArray()
      const typedCol = collections.find((c) => c.name === 'typed_col')

      expect(typedCol).toBeDefined()
      expect(typedCol!.type).toBe('collection')
    })
  })

  describe('collStats', () => {
    it('should return collection statistics', async () => {
      await mongo.seed('stats_col', [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }])

      const client = connectionManager.getClient()
      const stats = await client.db(DB).command({ collStats: 'stats_col' })

      expect(stats.ns).toBe(`${DB}.stats_col`)
      expect(stats.count).toBe(3)
      expect(typeof stats.size).toBe('number')
      expect(typeof stats.storageSize).toBe('number')
      expect(stats.nindexes).toBeGreaterThanOrEqual(1) // at least _id index
    })

    it('should show index count', async () => {
      await mongo.seed('indexed_col', [{ name: 'Alice', age: 30 }])

      const client = connectionManager.getClient()

      // Create an additional index
      await client.db(DB).collection('indexed_col').createIndex({ name: 1 })

      const stats = await client.db(DB).command({ collStats: 'indexed_col' })

      // _id index + name index
      expect(stats.nindexes).toBe(2)
    })
  })
})
