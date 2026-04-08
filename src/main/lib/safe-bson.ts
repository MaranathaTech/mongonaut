import { EJSON } from 'bson'

export function serializeDocuments(docs: unknown[]): unknown[] {
  return JSON.parse(EJSON.stringify(docs, { relaxed: true }))
}

export function serializeDocument(doc: unknown): unknown {
  return JSON.parse(EJSON.stringify(doc, { relaxed: true }))
}

export function deserializeDocument(doc: unknown): unknown {
  return EJSON.parse(JSON.stringify(doc), { relaxed: true })
}
