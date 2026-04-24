import { MongoClient, type Db, type Document } from 'mongodb'
import { afterAll, afterEach, beforeAll, inject } from 'vitest'
import { connectionManager } from '../../src/main/services/connection-manager'

interface TestMongo {
  db: Db
  seed: (collection: string, docs: Document[]) => Promise<void>
}

/**
 * Sets up a MongoDB connection for integration tests.
 *
 * - Connects `connectionManager` (the app singleton) to the in-memory mongod
 * - Opens a separate `directClient` for seeding data and verifying side effects
 * - Cleans all collections after each test
 * - Disconnects both clients after all tests in the file
 *
 * @param dbName Unique database name for this test file
 */
export function setupTestMongo(dbName: string): TestMongo {
  let directClient: MongoClient
  let db: Db

  const result: TestMongo = {
    get db() {
      return db
    },
    seed: async (collection: string, docs: Document[]) => {
      await db.collection(collection).insertMany(docs)
    }
  }

  beforeAll(async () => {
    const uri = inject('mongoUri')

    // Connect the app's singleton — this is what queryExecutor/schemaSampler use
    await connectionManager.connect({
      id: 'test',
      name: 'test',
      mode: 'uri',
      uri
    })

    // Separate client for test setup/teardown
    directClient = new MongoClient(uri)
    await directClient.connect()
    db = directClient.db(dbName)
  })

  afterEach(async () => {
    // Clean all collections between tests
    const collections = await db.listCollections().toArray()
    for (const col of collections) {
      await db.collection(col.name).deleteMany({})
    }
  })

  afterAll(async () => {
    await connectionManager.disconnect()
    await directClient.close()
  })

  return result
}
