import { describe, it, expect } from 'vitest'
import { queryExecutor } from '../../src/main/services/query-executor'
import { setupTestMongo } from './test-utils'

const mongo = setupTestMongo('test_query_executor')

describe('QueryExecutor integration', () => {
  describe('find', () => {
    it('should find documents with implicit find syntax', async () => {
      await mongo.seed('users', [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 35 }
      ])

      const result = await queryExecutor.execute({
        database: 'test_query_executor',
        collection: 'users',
        queryText: '{}',
        page: 1,
        pageSize: 50
      })

      expect(result.totalCount).toBe(3)
      expect(result.documents).toHaveLength(3)
    })

    it('should filter documents with query', async () => {
      await mongo.seed('users', [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 35 }
      ])

      const result = await queryExecutor.execute({
        database: 'test_query_executor',
        collection: 'users',
        queryText: '{age: {$gt: 28}}',
        page: 1,
        pageSize: 50
      })

      expect(result.totalCount).toBe(2)
      expect(result.documents.map((d) => d.name)).toEqual(
        expect.arrayContaining(['Alice', 'Charlie'])
      )
    })

    it('should support db.collection.find() syntax', async () => {
      await mongo.seed('users', [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 }
      ])

      const result = await queryExecutor.execute({
        database: 'test_query_executor',
        collection: 'users',
        queryText: 'db.users.find({name: "Alice"})',
        page: 1,
        pageSize: 50
      })

      expect(result.totalCount).toBe(1)
      expect(result.documents[0].name).toBe('Alice')
    })

    it('should support sort chaining', async () => {
      await mongo.seed('users', [
        { name: 'Charlie', age: 35 },
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 }
      ])

      const result = await queryExecutor.execute({
        database: 'test_query_executor',
        collection: 'users',
        queryText: 'db.users.find({}).sort({age: 1})',
        page: 1,
        pageSize: 50
      })

      expect(result.documents.map((d) => d.name)).toEqual(['Bob', 'Alice', 'Charlie'])
    })

    it('should support projection', async () => {
      await mongo.seed('users', [{ name: 'Alice', age: 30, email: 'alice@test.com' }])

      const result = await queryExecutor.execute({
        database: 'test_query_executor',
        collection: 'users',
        queryText: 'db.users.find({}, {name: 1, _id: 0})',
        page: 1,
        pageSize: 50
      })

      expect(result.documents[0]).toEqual({ name: 'Alice' })
    })

    it('should paginate results', async () => {
      const docs = Array.from({ length: 15 }, (_, i) => ({ index: i, value: `item-${i}` }))
      await mongo.seed('items', docs)

      const page1 = await queryExecutor.execute({
        database: 'test_query_executor',
        collection: 'items',
        queryText: '{}',
        page: 1,
        pageSize: 10
      })

      expect(page1.totalCount).toBe(15)
      expect(page1.documents).toHaveLength(10)
      expect(page1.page).toBe(1)

      const page2 = await queryExecutor.execute({
        database: 'test_query_executor',
        collection: 'items',
        queryText: '{}',
        page: 2,
        pageSize: 10
      })

      expect(page2.documents).toHaveLength(5)
      expect(page2.page).toBe(2)
    })

    it('should return empty results for no matches', async () => {
      await mongo.seed('users', [{ name: 'Alice' }])

      const result = await queryExecutor.execute({
        database: 'test_query_executor',
        collection: 'users',
        queryText: '{name: "Nobody"}',
        page: 1,
        pageSize: 50
      })

      expect(result.totalCount).toBe(0)
      expect(result.documents).toHaveLength(0)
    })
  })

  describe('aggregate', () => {
    it('should run aggregation pipeline', async () => {
      await mongo.seed('sales', [
        { product: 'A', amount: 100 },
        { product: 'B', amount: 200 },
        { product: 'A', amount: 150 }
      ])

      const result = await queryExecutor.execute({
        database: 'test_query_executor',
        collection: 'sales',
        queryText: '[{$group: {_id: "$product", total: {$sum: "$amount"}}}]',
        page: 1,
        pageSize: 50
      })

      expect(result.totalCount).toBe(2)
      const totals = result.documents.reduce(
        (acc, d) => {
          acc[d._id as string] = d.total
          return acc
        },
        {} as Record<string, unknown>
      )
      expect(totals['A']).toBe(250)
      expect(totals['B']).toBe(200)
    })

    it('should support db.collection.aggregate() syntax', async () => {
      await mongo.seed('sales', [
        { product: 'A', amount: 100 },
        { product: 'B', amount: 200 }
      ])

      const result = await queryExecutor.execute({
        database: 'test_query_executor',
        collection: 'sales',
        queryText: 'db.sales.aggregate([{$match: {product: "A"}}])',
        page: 1,
        pageSize: 50
      })

      expect(result.totalCount).toBe(1)
      expect(result.documents[0].product).toBe('A')
    })

    it('should paginate aggregate results', async () => {
      const docs = Array.from({ length: 25 }, (_, i) => ({ index: i }))
      await mongo.seed('items', docs)

      const result = await queryExecutor.execute({
        database: 'test_query_executor',
        collection: 'items',
        queryText: '[{$sort: {index: 1}}]',
        page: 2,
        pageSize: 10
      })

      expect(result.totalCount).toBe(25)
      expect(result.documents).toHaveLength(10)
      expect(result.documents[0].index).toBe(10)
    })
  })

  describe('countDocuments', () => {
    it('should count all documents', async () => {
      await mongo.seed('users', [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }])

      const result = await queryExecutor.execute({
        database: 'test_query_executor',
        collection: 'users',
        queryText: 'db.users.countDocuments({})',
        page: 1,
        pageSize: 50
      })

      expect(result.documents).toHaveLength(1)
      expect(result.documents[0].count).toBe(3)
    })

    it('should count documents with filter', async () => {
      await mongo.seed('users', [
        { name: 'Alice', active: true },
        { name: 'Bob', active: false },
        { name: 'Charlie', active: true }
      ])

      const result = await queryExecutor.execute({
        database: 'test_query_executor',
        collection: 'users',
        queryText: 'db.users.countDocuments({active: true})',
        page: 1,
        pageSize: 50
      })

      expect(result.documents[0].count).toBe(2)
    })
  })

  describe('distinct', () => {
    it('should return distinct values', async () => {
      await mongo.seed('users', [
        { name: 'Alice', role: 'admin' },
        { name: 'Bob', role: 'user' },
        { name: 'Charlie', role: 'admin' }
      ])

      const result = await queryExecutor.execute({
        database: 'test_query_executor',
        collection: 'users',
        queryText: 'db.users.distinct("role")',
        page: 1,
        pageSize: 50
      })

      const values = result.documents.map((d) => d.value)
      expect(values).toEqual(expect.arrayContaining(['admin', 'user']))
      expect(values).toHaveLength(2)
    })

    it('should return distinct values with filter', async () => {
      await mongo.seed('users', [
        { name: 'Alice', role: 'admin', active: true },
        { name: 'Bob', role: 'user', active: false },
        { name: 'Charlie', role: 'admin', active: false }
      ])

      const result = await queryExecutor.execute({
        database: 'test_query_executor',
        collection: 'users',
        queryText: 'db.users.distinct("role", {active: true})',
        page: 1,
        pageSize: 50
      })

      expect(result.documents).toHaveLength(1)
      expect(result.documents[0].value).toBe('admin')
    })
  })

  describe('explain', () => {
    it('should return explain output for find', async () => {
      await mongo.seed('users', [{ name: 'Alice' }])

      const result = await queryExecutor.explain({
        database: 'test_query_executor',
        collection: 'users',
        queryText: '{name: "Alice"}'
      })

      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
      // Explain output contains queryPlanner or executionStats
      const explainDoc = result as Record<string, unknown>
      expect(
        explainDoc.queryPlanner !== undefined || explainDoc.executionStats !== undefined
      ).toBe(true)
    })

    it('should return explain output for aggregate', async () => {
      await mongo.seed('users', [{ name: 'Alice' }])

      const result = await queryExecutor.explain({
        database: 'test_query_executor',
        collection: 'users',
        queryText: '[{$match: {name: "Alice"}}]'
      })

      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
    })
  })
})
