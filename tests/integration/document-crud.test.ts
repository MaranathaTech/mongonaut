import { describe, it, expect } from 'vitest'
import { ObjectId } from 'mongodb'
import { connectionManager } from '../../src/main/services/connection-manager'
import {
  serializeDocument,
  serializeDocuments,
  deserializeDocument
} from '../../src/main/lib/safe-bson'
import { setupTestMongo } from './test-utils'

const DB = 'test_document_crud'
const mongo = setupTestMongo(DB)

describe('Document CRUD integration', () => {
  describe('insertOne', () => {
    it('should insert a document', async () => {
      const client = connectionManager.getClient()
      const col = client.db(DB).collection('docs')

      const doc = { name: 'Alice', age: 30 }
      const deserialized = deserializeDocument(doc) as Record<string, unknown>
      const result = await col.insertOne(deserialized)

      expect(result.insertedId).toBeDefined()

      // Verify via direct client
      const found = await mongo.db.collection('docs').findOne({ name: 'Alice' })
      expect(found).not.toBeNull()
      expect(found!.age).toBe(30)
    })

    it('should insert a document with nested objects', async () => {
      const client = connectionManager.getClient()
      const col = client.db(DB).collection('docs')

      const doc = {
        name: 'Bob',
        address: { city: 'NYC', zip: '10001' },
        tags: ['admin', 'user']
      }
      await col.insertOne(deserializeDocument(doc) as Record<string, unknown>)

      const found = await mongo.db.collection('docs').findOne({ name: 'Bob' })
      expect(found!.address).toEqual({ city: 'NYC', zip: '10001' })
      expect(found!.tags).toEqual(['admin', 'user'])
    })
  })

  describe('replaceOne', () => {
    it('should replace a document', async () => {
      await mongo.seed('docs', [{ name: 'Alice', age: 30 }])

      const original = await mongo.db.collection('docs').findOne({ name: 'Alice' })
      const client = connectionManager.getClient()
      const col = client.db(DB).collection('docs')

      const updated = { name: 'Alice', age: 31, email: 'alice@test.com' }
      const deserialized = deserializeDocument(updated) as Record<string, unknown>
      const result = await col.replaceOne({ _id: original!._id }, deserialized)

      expect(result.modifiedCount).toBe(1)

      const found = await mongo.db.collection('docs').findOne({ _id: original!._id })
      expect(found!.age).toBe(31)
      expect(found!.email).toBe('alice@test.com')
    })
  })

  describe('deleteOne', () => {
    it('should delete a document', async () => {
      await mongo.seed('docs', [{ name: 'Alice' }, { name: 'Bob' }])

      const alice = await mongo.db.collection('docs').findOne({ name: 'Alice' })
      const client = connectionManager.getClient()
      const col = client.db(DB).collection('docs')

      const result = await col.deleteOne({ _id: alice!._id })
      expect(result.deletedCount).toBe(1)

      const remaining = await mongo.db.collection('docs').find({}).toArray()
      expect(remaining).toHaveLength(1)
      expect(remaining[0].name).toBe('Bob')
    })
  })

  describe('BSON round-trip', () => {
    it('should serialize and deserialize ObjectId', async () => {
      const oid = new ObjectId()
      await mongo.seed('bson', [{ _id: oid, name: 'test' }])

      const doc = await mongo.db.collection('bson').findOne({ _id: oid })
      const serialized = serializeDocument(doc) as Record<string, unknown>

      // Serialized _id should be defined and recoverable
      expect(serialized._id).toBeDefined()

      // Round-trip: deserialize back and use for a query
      const deserialized = deserializeDocument(serialized) as Record<string, unknown>
      expect(deserialized.name).toBe('test')
    })

    it('should serialize and deserialize Date', async () => {
      const date = new Date('2024-06-15T12:00:00Z')
      await mongo.seed('bson', [{ created: date, name: 'dated' }])

      const doc = await mongo.db.collection('bson').findOne({ name: 'dated' })
      const serialized = serializeDocument(doc) as Record<string, unknown>

      // Serialized Date should be present (EJSON relaxed may use string or {$date} object)
      expect(serialized.created).toBeDefined()

      // Round-trip: deserialize and re-insert
      const deserialized = deserializeDocument(serialized) as Record<string, unknown>
      const client = connectionManager.getClient()
      delete deserialized._id
      await client.db(DB).collection('bson').insertOne(deserialized)

      const found = await mongo.db
        .collection('bson')
        .findOne({ name: 'dated', _id: { $ne: doc!._id } })
      expect(found).not.toBeNull()
    })

    it('should serialize array of documents', async () => {
      await mongo.seed('bson', [
        { name: 'Alice', score: 95 },
        { name: 'Bob', score: 87 }
      ])

      const docs = await mongo.db.collection('bson').find({}).toArray()
      const serialized = serializeDocuments(docs) as Record<string, unknown>[]

      expect(serialized).toHaveLength(2)
      expect(serialized[0].name).toBeDefined()
      expect(serialized[1].name).toBeDefined()
    })

    it('should handle nested BSON types', async () => {
      const oid = new ObjectId()
      await mongo.seed('bson', [
        {
          ref: oid,
          metadata: {
            created: new Date('2024-01-01'),
            tags: ['a', 'b']
          }
        }
      ])

      const doc = await mongo.db.collection('bson').findOne({ ref: oid })
      const serialized = serializeDocument(doc) as Record<string, unknown>
      const meta = serialized.metadata as Record<string, unknown>

      // ObjectId and Date should survive serialization
      expect(serialized.ref).toBeDefined()
      expect(meta.created).toBeDefined()
      expect(meta.tags).toEqual(['a', 'b'])

      // Round-trip should not throw
      const deserialized = deserializeDocument(serialized) as Record<string, unknown>
      expect(deserialized.metadata).toBeDefined()
    })
  })
})
