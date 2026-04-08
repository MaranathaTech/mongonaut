import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api'

export const monarchLanguage: monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.mongodb',

  keywords: ['db', 'true', 'false', 'null', 'undefined', 'NaN', 'Infinity'],

  bsonConstructors: [
    'ObjectId',
    'ISODate',
    'NumberLong',
    'NumberInt',
    'NumberDecimal',
    'Timestamp',
    'BinData',
    'UUID',
    'MinKey',
    'MaxKey',
    'RegExp',
    'DBRef',
    'Code'
  ],

  operators: [
    '$eq', '$gt', '$gte', '$in', '$lt', '$lte', '$ne', '$nin',
    '$and', '$or', '$not', '$nor',
    '$exists', '$type', '$regex', '$text', '$where', '$expr',
    '$match', '$group', '$project', '$sort', '$limit', '$skip',
    '$unwind', '$lookup', '$addFields', '$set', '$unset', '$inc',
    '$push', '$pull', '$addToSet', '$pop', '$mul', '$min', '$max',
    '$count', '$facet', '$out', '$merge', '$sample', '$bucket',
    '$replaceRoot', '$replaceWith', '$sortByCount', '$graphLookup',
    '$unionWith', '$redact', '$bucketAuto'
  ],

  tokenizer: {
    root: [
      // Comments
      [/\/\/.*$/, 'comment'],
      [/\/\*/, 'comment', '@comment'],

      // Strings
      [/"([^"\\]|\\.)*"/, 'string'],
      [/'([^'\\]|\\.)*'/, 'string'],
      // Template strings
      [/`([^`\\]|\\.)*`/, 'string'],

      // BSON constructors
      [/[A-Z][a-zA-Z]*(?=\s*\()/, {
        cases: {
          '@bsonConstructors': 'type.identifier',
          '@default': 'identifier'
        }
      }],

      // $ operators (e.g. $match, $gt)
      [/\$[a-zA-Z_][a-zA-Z0-9_]*/, 'keyword.operator'],

      // db keyword
      [/\bdb\b/, 'keyword'],

      // Method calls (.find, .aggregate, etc.)
      [/\.[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()/, 'function'],

      // Numbers
      [/-?\d+(\.\d+)?([eE][+-]?\d+)?/, 'number'],

      // Boolean / null / undefined
      [/\b(true|false|null|undefined|NaN|Infinity)\b/, 'keyword'],

      // Identifiers (field names before colon)
      [/[a-zA-Z_][a-zA-Z0-9_]*(?=\s*:)/, 'variable'],

      // Regular identifiers
      [/[a-zA-Z_][a-zA-Z0-9_]*/, 'identifier'],

      // Regex literals
      [/\/(?=[^/*])(?:[^/\\]|\\.)*\/[gimsuy]*/, 'regexp'],

      // Brackets
      [/[{}()\[\]]/, '@brackets'],

      // Delimiters
      [/[,;:.]/, 'delimiter'],

      // Whitespace
      [/\s+/, 'white']
    ],

    comment: [
      [/[^/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[/*]/, 'comment']
    ]
  }
}
