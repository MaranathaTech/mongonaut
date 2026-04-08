export interface OperatorInfo {
  label: string
  detail: string
  documentation: string
  insertText: string
}

export const queryOperators: OperatorInfo[] = [
  // Comparison
  { label: '$eq', detail: 'Comparison', documentation: 'Matches values equal to a specified value.', insertText: '\\$eq: ' },
  { label: '$gt', detail: 'Comparison', documentation: 'Matches values greater than a specified value.', insertText: '\\$gt: ' },
  { label: '$gte', detail: 'Comparison', documentation: 'Matches values greater than or equal to a specified value.', insertText: '\\$gte: ' },
  { label: '$in', detail: 'Comparison', documentation: 'Matches any of the values in an array.', insertText: '\\$in: [$0]' },
  { label: '$lt', detail: 'Comparison', documentation: 'Matches values less than a specified value.', insertText: '\\$lt: ' },
  { label: '$lte', detail: 'Comparison', documentation: 'Matches values less than or equal to a specified value.', insertText: '\\$lte: ' },
  { label: '$ne', detail: 'Comparison', documentation: 'Matches values not equal to a specified value.', insertText: '\\$ne: ' },
  { label: '$nin', detail: 'Comparison', documentation: 'Matches none of the values in an array.', insertText: '\\$nin: [$0]' },

  // Logical
  { label: '$and', detail: 'Logical', documentation: 'Joins query clauses with a logical AND.', insertText: '\\$and: [$0]' },
  { label: '$or', detail: 'Logical', documentation: 'Joins query clauses with a logical OR.', insertText: '\\$or: [$0]' },
  { label: '$not', detail: 'Logical', documentation: 'Inverts the effect of a query predicate.', insertText: '\\$not: { $0 }' },
  { label: '$nor', detail: 'Logical', documentation: 'Joins query clauses with a logical NOR.', insertText: '\\$nor: [$0]' },

  // Element
  { label: '$exists', detail: 'Element', documentation: 'Matches documents that have the specified field.', insertText: '\\$exists: true' },
  { label: '$type', detail: 'Element', documentation: 'Selects documents if a field is of the specified type.', insertText: '\\$type: "$0"' },

  // Evaluation
  { label: '$regex', detail: 'Evaluation', documentation: 'Selects documents where values match a specified regular expression.', insertText: '\\$regex: /$0/' },
  { label: '$text', detail: 'Evaluation', documentation: 'Performs text search.', insertText: '\\$text: { \\$search: "$0" }' },
  { label: '$where', detail: 'Evaluation', documentation: 'Matches documents that satisfy a JavaScript expression.', insertText: '\\$where: "$0"' },
  { label: '$expr', detail: 'Evaluation', documentation: 'Allows use of aggregation expressions within the query language.', insertText: '\\$expr: { $0 }' },
  { label: '$jsonSchema', detail: 'Evaluation', documentation: 'Validate documents against the given JSON Schema.', insertText: '\\$jsonSchema: { $0 }' },
  { label: '$mod', detail: 'Evaluation', documentation: 'Performs a modulo operation on the value of a field.', insertText: '\\$mod: [$1, $0]' },

  // Array
  { label: '$all', detail: 'Array', documentation: 'Matches arrays that contain all elements specified.', insertText: '\\$all: [$0]' },
  { label: '$elemMatch', detail: 'Array', documentation: 'Matches documents that contain an array field with at least one element matching all criteria.', insertText: '\\$elemMatch: { $0 }' },
  { label: '$size', detail: 'Array', documentation: 'Selects documents if the array field is a specified size.', insertText: '\\$size: $0' },

  // Geospatial
  { label: '$geoWithin', detail: 'Geospatial', documentation: 'Selects geometries within a bounding GeoJSON geometry.', insertText: '\\$geoWithin: { $0 }' },
  { label: '$geoIntersects', detail: 'Geospatial', documentation: 'Selects geometries that intersect with a GeoJSON geometry.', insertText: '\\$geoIntersects: { $0 }' },
  { label: '$near', detail: 'Geospatial', documentation: 'Returns geospatial objects in proximity to a point.', insertText: '\\$near: { $0 }' },
  { label: '$nearSphere', detail: 'Geospatial', documentation: 'Returns geospatial objects in proximity to a point on a sphere.', insertText: '\\$nearSphere: { $0 }' },
]

export const aggregationStages: OperatorInfo[] = [
  { label: '$match', detail: 'Stage', documentation: 'Filters documents to pass only matching documents to the next stage.', insertText: '{ \\$match: { $0 } }' },
  { label: '$group', detail: 'Stage', documentation: 'Groups input documents by the specified _id expression.', insertText: '{ \\$group: { _id: $0 } }' },
  { label: '$project', detail: 'Stage', documentation: 'Passes along documents with the requested fields.', insertText: '{ \\$project: { $0 } }' },
  { label: '$sort', detail: 'Stage', documentation: 'Reorders the document stream by a specified sort key.', insertText: '{ \\$sort: { $0: 1 } }' },
  { label: '$limit', detail: 'Stage', documentation: 'Passes the first n documents to the next stage.', insertText: '{ \\$limit: $0 }' },
  { label: '$skip', detail: 'Stage', documentation: 'Skips the first n documents.', insertText: '{ \\$skip: $0 }' },
  { label: '$unwind', detail: 'Stage', documentation: 'Deconstructs an array field from the input documents.', insertText: '{ \\$unwind: "\\$$0" }' },
  { label: '$lookup', detail: 'Stage', documentation: 'Performs a left outer join to another collection.', insertText: '{ \\$lookup: { from: "$1", localField: "$2", foreignField: "$3", as: "$0" } }' },
  { label: '$addFields', detail: 'Stage', documentation: 'Adds new fields to documents.', insertText: '{ \\$addFields: { $0 } }' },
  { label: '$set', detail: 'Stage', documentation: 'Alias for $addFields. Adds new fields to documents.', insertText: '{ \\$set: { $0 } }' },
  { label: '$unset', detail: 'Stage', documentation: 'Removes fields from documents.', insertText: '{ \\$unset: "$0" }' },
  { label: '$count', detail: 'Stage', documentation: 'Returns a count of the number of documents at this stage.', insertText: '{ \\$count: "$0" }' },
  { label: '$facet', detail: 'Stage', documentation: 'Processes multiple aggregation pipelines within a single stage.', insertText: '{ \\$facet: { $0: [] } }' },
  { label: '$out', detail: 'Stage', documentation: 'Writes the resulting documents to a collection.', insertText: '{ \\$out: "$0" }' },
  { label: '$merge', detail: 'Stage', documentation: 'Writes the results to a specified collection.', insertText: '{ \\$merge: { into: "$0" } }' },
  { label: '$replaceRoot', detail: 'Stage', documentation: 'Replaces the input document with the specified document.', insertText: '{ \\$replaceRoot: { newRoot: "$$$0" } }' },
  { label: '$replaceWith', detail: 'Stage', documentation: 'Replaces the input document with the specified document.', insertText: '{ \\$replaceWith: "$$$0" }' },
  { label: '$sample', detail: 'Stage', documentation: 'Randomly selects the specified number of documents.', insertText: '{ \\$sample: { size: $0 } }' },
  { label: '$redact', detail: 'Stage', documentation: 'Restricts the contents of the documents.', insertText: '{ \\$redact: "$0" }' },
  { label: '$bucket', detail: 'Stage', documentation: 'Categorizes documents into groups (buckets).', insertText: '{ \\$bucket: { groupBy: "$0", boundaries: [] } }' },
  { label: '$bucketAuto', detail: 'Stage', documentation: 'Categorizes documents into a specified number of groups.', insertText: '{ \\$bucketAuto: { groupBy: "$0", buckets: 5 } }' },
  { label: '$sortByCount', detail: 'Stage', documentation: 'Groups documents by expression and sorts by count.', insertText: '{ \\$sortByCount: "$0" }' },
  { label: '$graphLookup', detail: 'Stage', documentation: 'Performs a recursive search on a collection.', insertText: '{ \\$graphLookup: { from: "$1", startWith: "$2", connectFromField: "$3", connectToField: "$4", as: "$0" } }' },
  { label: '$unionWith', detail: 'Stage', documentation: 'Performs a union of two collections.', insertText: '{ \\$unionWith: { coll: "$0" } }' },
]

export const updateOperators: OperatorInfo[] = [
  // Field update
  { label: '$set', detail: 'Update', documentation: 'Sets the value of a field in a document.', insertText: '\\$set: { $0 }' },
  { label: '$unset', detail: 'Update', documentation: 'Removes the specified field from a document.', insertText: '\\$unset: { $0: "" }' },
  { label: '$inc', detail: 'Update', documentation: 'Increments the value of the field by the specified amount.', insertText: '\\$inc: { $0: 1 }' },
  { label: '$mul', detail: 'Update', documentation: 'Multiplies the value of the field by the specified amount.', insertText: '\\$mul: { $0: 1 }' },
  { label: '$rename', detail: 'Update', documentation: 'Renames a field.', insertText: '\\$rename: { "$1": "$0" }' },
  { label: '$min', detail: 'Update', documentation: 'Updates the field if the specified value is less than the existing value.', insertText: '\\$min: { $0 }' },
  { label: '$max', detail: 'Update', documentation: 'Updates the field if the specified value is greater than the existing value.', insertText: '\\$max: { $0 }' },
  { label: '$currentDate', detail: 'Update', documentation: 'Sets the value of a field to current date.', insertText: '\\$currentDate: { $0: true }' },
  { label: '$setOnInsert', detail: 'Update', documentation: 'Sets the value of a field if an update results in an insert.', insertText: '\\$setOnInsert: { $0 }' },

  // Array update
  { label: '$push', detail: 'Array Update', documentation: 'Appends a specified value to an array.', insertText: '\\$push: { $0 }' },
  { label: '$pull', detail: 'Array Update', documentation: 'Removes all array elements that match a specified query.', insertText: '\\$pull: { $0 }' },
  { label: '$addToSet', detail: 'Array Update', documentation: 'Adds elements to an array only if they do not already exist.', insertText: '\\$addToSet: { $0 }' },
  { label: '$pop', detail: 'Array Update', documentation: 'Removes the first or last item of an array.', insertText: '\\$pop: { $0: 1 }' },
  { label: '$pullAll', detail: 'Array Update', documentation: 'Removes all matching values from an array.', insertText: '\\$pullAll: { $0: [] }' },
  { label: '$each', detail: 'Array Modifier', documentation: 'Modifies $push and $addToSet to append multiple items.', insertText: '\\$each: [$0]' },
  { label: '$slice', detail: 'Array Modifier', documentation: 'Modifies $push to limit the size of updated arrays.', insertText: '\\$slice: $0' },
  { label: '$sort', detail: 'Array Modifier', documentation: 'Modifies $push to reorder documents stored in an array.', insertText: '\\$sort: { $0: 1 }' },
  { label: '$position', detail: 'Array Modifier', documentation: 'Modifies $push to specify the position in the array to add elements.', insertText: '\\$position: $0' },
]

export const collectionMethods: OperatorInfo[] = [
  { label: 'find', detail: 'Query', documentation: 'Selects documents in a collection.', insertText: 'find({$0})' },
  { label: 'findOne', detail: 'Query', documentation: 'Returns one document that satisfies the specified query criteria.', insertText: 'findOne({$0})' },
  { label: 'aggregate', detail: 'Aggregation', documentation: 'Performs aggregation operations using the aggregation pipeline.', insertText: 'aggregate([$0])' },
  { label: 'countDocuments', detail: 'Query', documentation: 'Returns the count of documents that match the query.', insertText: 'countDocuments({$0})' },
  { label: 'estimatedDocumentCount', detail: 'Query', documentation: 'Returns an estimate of the count of documents in a collection.', insertText: 'estimatedDocumentCount()' },
  { label: 'distinct', detail: 'Query', documentation: 'Returns an array of distinct values for a specified field.', insertText: 'distinct("$0")' },
  { label: 'insertOne', detail: 'Write', documentation: 'Inserts a single document into a collection.', insertText: 'insertOne({$0})' },
  { label: 'insertMany', detail: 'Write', documentation: 'Inserts multiple documents into a collection.', insertText: 'insertMany([$0])' },
  { label: 'updateOne', detail: 'Write', documentation: 'Updates a single document within the collection.', insertText: 'updateOne({$1}, {$0})' },
  { label: 'updateMany', detail: 'Write', documentation: 'Updates all documents that match the specified filter.', insertText: 'updateMany({$1}, {$0})' },
  { label: 'deleteOne', detail: 'Write', documentation: 'Removes a single document from a collection.', insertText: 'deleteOne({$0})' },
  { label: 'deleteMany', detail: 'Write', documentation: 'Removes all documents that match the filter.', insertText: 'deleteMany({$0})' },
  { label: 'replaceOne', detail: 'Write', documentation: 'Replaces a single document within the collection.', insertText: 'replaceOne({$1}, {$0})' },
  { label: 'findOneAndUpdate', detail: 'Write', documentation: 'Finds a single document and updates it.', insertText: 'findOneAndUpdate({$1}, {$0})' },
  { label: 'findOneAndReplace', detail: 'Write', documentation: 'Finds a single document and replaces it.', insertText: 'findOneAndReplace({$1}, {$0})' },
  { label: 'findOneAndDelete', detail: 'Write', documentation: 'Finds a single document and deletes it.', insertText: 'findOneAndDelete({$0})' },
  { label: 'bulkWrite', detail: 'Write', documentation: 'Performs multiple write operations with controls for order of execution.', insertText: 'bulkWrite([$0])' },
  { label: 'createIndex', detail: 'Index', documentation: 'Creates an index on the specified field(s).', insertText: 'createIndex({$0: 1})' },
  { label: 'dropIndex', detail: 'Index', documentation: 'Drops the specified index.', insertText: 'dropIndex("$0")' },
  { label: 'getIndexes', detail: 'Index', documentation: 'Returns an array of documents describing existing indexes.', insertText: 'getIndexes()' },
]
