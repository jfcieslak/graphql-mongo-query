# graphql-mongo-query

[![Greenkeeper badge](https://badges.greenkeeper.io/jfcieslak/graphql-mongo-query.svg)](https://greenkeeper.io/)
![Build Status](https://travis-ci.org/jfcieslak/graphql-mongo-query.svg?branch=master)
[![npm](https://img.shields.io/npm/v/@konfy/graphql-mongo-query.svg)](https://www.npmjs.com/package/@konfy/graphql-mongo-query)

Parse GraphQL Input arguments to MongoDB query filters. For use in GraphQL resolvers.

## What does it do?

This small package helps with converting GraphQL `Input` arguments to MongoDB filters, following a certain convention. It supports:

-   logical queries (`$or` `$and` `$nor`,`$not`,`$all`)
-   comparative queries (`$ne` `$in` `$nin`, `$lt`, `$lte`, `$gt`, `$gte`)
-   Embedded object queries like: `{"embedded.level1.level2": 10}`

And combinations of the above.

## Convention:

By default, this parser assumes a simple structural convention for writing your `Input` arguments, which resembles mongoDB query format as closely as possible:

1.  write mongo keywords like so:

    `_OR` will parse to: `$or`

    `_NIN` will parse to: `$nin` etc.

2.  Use nested objects for embedded queries, like so:

    `{ nested: { level1: { level2: { _NE: 10 } } } }` will parse to:
    `{ 'nested.level1.level2': { $ne: 10 } }`

## Usage:

**IMPORTANT:**

Since version 2 this package is a pure function by default. If you want to use the deprecated class syntax, you can import it from `graphql-mongo-query/class`

**version >= 2.0.0**

```javascript
import GQLMongoQuery from 'graphql-mongo-query'
// Example arguments:
const query = { _OR: [{ num: 10 }, { nested: {property: 'X'} }] }

const parser = GQLMongoQuery(<keywords?>, <resolvers?>, <merge?>)
const MongoFilters = parser(query)

// MongoFilters will equal to:
// {$or: [ { num: 10 }, { 'nested.property': 'X' } ]}
```

**version < 2.0.0**

```javascript
import GQLMongoQuery from 'graphql-mongo-query/dist/class'
// Example arguments:
const query = { _OR: [{ num: 10 }, { nested: {property: 'X'} }] }

const parser = new GQLMongoQuery(<keywords?>, <resolvers?>, <merge?>)
const MongoFilters = parser.buildFilters(query)

// MongoFilters will equal to:
// {$or: [ { num: 10 }, { 'nested.property': 'X' } ]}
```

## Options:

`graphql-mongo-query` takes options to customize your keywords and special value entities. All options are optional. By default, they will be merged with defaults.

### `keywords` (optional)

Maps the query keywords to mongo keywords. Every key in this object will be replaced by corresponding value.

```javascript
// Defaults:
{
	// logical operators:
	_OR: '$or',
	_AND: '$and',
	_NOR: '$nor',
	// comparison operators:
	_ALL: '$all',
	_IN: '$in',
	_NIN: '$nin',
	_EQ: '$eq',
	_NE: '$ne',
	_LT: '$lt',
	_LTE: '$lte',
	_GT: '$gt',
	_GTE: '$gte',
	// geo queries operators:
	_GEO_INTERSECTS: '$geoIntersects',
	_GEO_WITHIN: '$geoWithin',
	_NEAR: '$near',
	// geo shapes operators:
	_GEOMETRY: '$geometry',
	_BOX: '$box',
	_POLYGON: '$polygon',
	_CENTER: '$center',
	_CENTER_SPHERE: '$centerSphere',
	_MAX_DISTANCE: '$maxDistance',
	_MIN_DISTANCE: '$minDistance'
}
```

### `resolvers` (optional)

An object mapping specified query keys to custom resolver functions that will return a new key and value.

These resolver functions take `parent` object as the only parameter, and should return a value that will replace that parent. Parent object is a single single `{key: value}` pair.

The parser will iterate through a query, and when finding a key that matches, it will replace the entire `{key: value}` pair with the result of the resolver function.

```typescript
// Examples:
const resolvers = {
	// convert to boolean
	someTruthyVal(parent) {
		return { someTruthyVal: !!parent.someTruthyVal }
	},
	// replace value with true
	'nested.a'() {
		return { 'nested.a': true }
	},
	// replace nested.b.n with it's squared value
	'nested.b'(parent) {
		const squared = parent['nested.b'].n * parent['nested.b'].n
		return { ...parent, n: squared }
	},
	// convert string to Date
	'nested.date'(parent) {
		return { 'nested.date': new Date(parent['nested.date']) }
	},
	// rename the key
	'nested.rename'(parent) {
		const newname = parent['nested.rename']
		delete parent['nested.rename']
		return { newname }
	}
}
```

### `merge` (optional, default: `true`)

If set to true, `keywords` and `resolvers` from options will be merged with defaults. Otherwise they will overwrite the defaults.

## Examples

For examples checkout the [tests](https://github.com/jfcieslak/graphql-mongo-query/blob/master/tests/index.test.ts)

An example of a complex Input filter and it’s parsed value:

```javascript
// resolvers option object
const resolvers = {
	dateField(parent) {
		parent.dateField = new Date(parent.dateField)
		return parent
	}
}

// query received from graphQL input:
const query = {
	_OR: [{ field1: { _NE: 'not me' } }, { field2: { _IN: ['A', 'B'] } }],
	nested: { level1: { level2: { _NE: 10 } } },
	dateField: '2020-02-20'
}

// Parsed filter:
const filter = GQLMongoQuery(null, resolvers)
expect(filter).toEqual({
	$or: [{ field1: { $ne: 'not me' } }, { field2: { $in: ['A', 'B'] } }],
	'nested.level1.level2': { $ne: 10 },
	dateField: new Date('2020-02-20')
})
```
