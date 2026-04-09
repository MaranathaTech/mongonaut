/**
 * Validators for IPC arguments that cross the renderer->main trust boundary.
 * MongoDB's driver does its own checks, but we want to reject obviously bad
 * input early with clear errors, and close small classes of bug (null-byte
 * smuggling, oversized names, reserved names) at one chokepoint.
 */

const DB_NAME_MAX = 63
const COLLECTION_NAME_MAX = 120
const FIELD_NAME_MAX = 1024

// Per MongoDB docs: db names cannot contain / \ . " $ * < > : | ?, NUL, or space,
// and cannot be empty.
const DB_NAME_INVALID = /[\0/\\. "$*<>:|?]/

export function assertDbName(name: unknown): asserts name is string {
  if (typeof name !== 'string') {
    throw new Error('Invalid database name: expected string')
  }
  if (name.length === 0) {
    throw new Error('Invalid database name: empty')
  }
  if (name.length > DB_NAME_MAX) {
    throw new Error(`Invalid database name: exceeds ${DB_NAME_MAX} characters`)
  }
  if (DB_NAME_INVALID.test(name)) {
    throw new Error('Invalid database name: contains illegal characters')
  }
}

export function assertCollectionName(name: unknown): asserts name is string {
  if (typeof name !== 'string') {
    throw new Error('Invalid collection name: expected string')
  }
  if (name.length === 0) {
    throw new Error('Invalid collection name: empty')
  }
  if (name.length > COLLECTION_NAME_MAX) {
    throw new Error(`Invalid collection name: exceeds ${COLLECTION_NAME_MAX} characters`)
  }
  if (/\0/.test(name)) {
    throw new Error('Invalid collection name: contains NUL byte')
  }
  if (name.startsWith('system.')) {
    throw new Error('Reserved collection name: "system." prefix is not allowed')
  }
  if (name.startsWith('$')) {
    throw new Error('Invalid collection name: cannot start with "$"')
  }
}

export function assertFieldName(name: unknown): asserts name is string {
  if (typeof name !== 'string') {
    throw new Error('Invalid field name: expected string')
  }
  if (name.length === 0) {
    throw new Error('Invalid field name: empty')
  }
  if (name.length > FIELD_NAME_MAX) {
    throw new Error(`Invalid field name: exceeds ${FIELD_NAME_MAX} characters`)
  }
  if (/\0/.test(name)) {
    throw new Error('Invalid field name: contains NUL byte')
  }
}
