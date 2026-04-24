import { MongoMemoryServer } from 'mongodb-memory-server'
import type { TestProject } from 'vitest/node'

let mongod: MongoMemoryServer

export async function setup(project: TestProject): Promise<void> {
  mongod = await MongoMemoryServer.create()
  const uri = mongod.getUri()
  project.provide('mongoUri', uri)
}

export async function teardown(): Promise<void> {
  if (mongod) {
    await mongod.stop()
  }
}
