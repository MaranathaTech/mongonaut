import { EJSON } from 'bson';

const MAX_DOC_BYTES = 32 * 1024 * 1024; // 32 MB — doubles Mongo's 16 MB doc limit

export function serializeDocuments(docs: unknown[]): unknown[] {
  return JSON.parse(EJSON.stringify(docs, { relaxed: true }));
}

export function serializeDocument(doc: unknown): unknown {
  return JSON.parse(EJSON.stringify(doc, { relaxed: true }));
}

export function deserializeDocument(doc: unknown): unknown {
  const s = JSON.stringify(doc);
  if (s === undefined) {
    throw new Error('Document could not be serialized');
  }
  if (s.length > MAX_DOC_BYTES) {
    throw new Error(`Document exceeds ${MAX_DOC_BYTES} byte limit`);
  }
  return EJSON.parse(s, { relaxed: true });
}
