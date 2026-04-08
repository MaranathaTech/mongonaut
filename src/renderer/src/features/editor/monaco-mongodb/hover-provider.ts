import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import {
  queryOperators,
  aggregationStages,
  updateOperators
} from './mongodb-operators'
import type { SchemaField } from '../../../../../shared/types'

const BSON_CONSTRUCTORS: Record<string, string> = {
  ObjectId: 'Creates a new ObjectId — a 12-byte unique identifier used as the default `_id` value.',
  ISODate: 'Creates a Date object from an ISO 8601 date string.',
  NumberLong: 'Creates a 64-bit integer (Long) value.',
  NumberInt: 'Creates a 32-bit integer value.',
  NumberDecimal: 'Creates a 128-bit decimal (Decimal128) value for high-precision arithmetic.',
  Timestamp: 'Creates a BSON Timestamp, used internally for replication oplog.',
  BinData: 'Creates a Binary Data value.',
  UUID: 'Creates a UUID (universally unique identifier) stored as Binary subtype 4.',
  MinKey: 'The minimum BSON key value — compares less than all other values.',
  MaxKey: 'The maximum BSON key value — compares greater than all other values.',
  DBRef: 'Creates a database reference to a document in another collection.',
  Code: 'Creates a BSON Code value containing JavaScript.'
}

// Build a lookup map for all operators
const operatorMap = new Map<string, string>()
for (const op of [...queryOperators, ...aggregationStages, ...updateOperators]) {
  if (!operatorMap.has(op.label)) {
    operatorMap.set(op.label, `**${op.label}** _(${op.detail})_\n\n${op.documentation}`)
  }
}

export function createHoverProvider(
  fields: SchemaField[],
  _monacoInstance: typeof monaco
): monaco.languages.HoverProvider {
  // Build a lookup map for field names
  const fieldMap = new Map<string, SchemaField>()
  for (const field of fields) {
    fieldMap.set(field.path, field)
  }

  return {
    provideHover(
      model: monaco.editor.ITextModel,
      position: monaco.Position
    ): monaco.languages.ProviderResult<monaco.languages.Hover> {
      const word = model.getWordAtPosition(position)
      if (!word) return null

      const lineContent = model.getLineContent(position.lineNumber)
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      }

      // Check if the character before the word is $ (operator)
      const charBefore = word.startColumn > 1 ? lineContent[word.startColumn - 2] : ''
      if (charBefore === '$') {
        const operatorName = `$${word.word}`
        const doc = operatorMap.get(operatorName)
        if (doc) {
          return {
            range: { ...range, startColumn: range.startColumn - 1 },
            contents: [{ value: doc }]
          }
        }
      }

      // Check for BSON constructor
      const bsonDoc = BSON_CONSTRUCTORS[word.word]
      if (bsonDoc) {
        return {
          range,
          contents: [{ value: `**${word.word}**\n\n${bsonDoc}` }]
        }
      }

      // Check for field name match (also try dotted paths by expanding word)
      // Get full dotted path at position (word boundaries don't include dots)
      const fullPath = getDottedPathAtPosition(lineContent, word.startColumn - 1, word.endColumn - 1)
      const field = fieldMap.get(fullPath) ?? fieldMap.get(word.word)
      if (field) {
        const typeStr = field.types.join(' | ')
        const pct = Math.round(field.frequency * 100)
        return {
          range,
          contents: [{ value: `**${field.path}**\n\nType: \`${typeStr}\`\nFrequency: ${pct}% of sampled documents` }]
        }
      }

      return null
    }
  }
}

/** Expand word boundaries to include dotted path segments (e.g., "address.city") */
function getDottedPathAtPosition(line: string, startIdx: number, endIdx: number): string {
  // Expand left past dots and word chars
  let left = startIdx
  while (left > 0) {
    const ch = line[left - 1]
    if (ch === '.' || /[\w]/.test(ch)) {
      left--
    } else {
      break
    }
  }
  // Expand right past dots and word chars
  let right = endIdx
  while (right < line.length) {
    const ch = line[right]
    if (ch === '.' || /[\w]/.test(ch)) {
      right++
    } else {
      break
    }
  }
  return line.substring(left, right)
}
