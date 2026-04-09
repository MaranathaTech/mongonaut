const EJSON_TYPE_WRAPPERS = new Set([
  '$oid',
  '$date',
  '$numberLong',
  '$numberDecimal',
  '$numberDouble',
  '$numberInt',
  '$binary',
  '$uuid',
  '$symbol',
  '$code',
  '$timestamp',
  '$regularExpression',
  '$minKey',
  '$maxKey'
])

export function assertSafeDocumentId(parsed: unknown): void {
  if (
    parsed === null ||
    typeof parsed === 'string' ||
    typeof parsed === 'number' ||
    typeof parsed === 'boolean'
  ) {
    return
  }

  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid document id: must be a scalar or EJSON type wrapper object')
  }

  const keys = Object.keys(parsed as Record<string, unknown>)
  if (keys.length === 0) {
    throw new Error('Invalid document id: empty object')
  }

  const walk = (value: unknown): void => {
    if (value === null || typeof value !== 'object') return
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k.startsWith('$') && !EJSON_TYPE_WRAPPERS.has(k)) {
        throw new Error(`Invalid document id: operator "${k}" not allowed`)
      }
      walk(v)
    }
  }
  walk(parsed)
}

export function assertNoTopLevelOperators(doc: unknown, context: string): void {
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error(`${context}: expected an object`)
  }
  for (const key of Object.keys(doc as Record<string, unknown>)) {
    if (key.startsWith('$')) {
      throw new Error(`${context}: top-level key "${key}" is not allowed`)
    }
  }
}
