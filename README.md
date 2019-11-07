# graphql-mongo-query

[![Greenkeeper badge](https://badges.greenkeeper.io/jfcieslak/graphql-mongo-query.svg)](https://greenkeeper.io/)
![Build Status](https://travis-ci.org/jfcieslak/graphql-mongo-query.svg?branch=master)
[![npm](https://img.shields.io/npm/v/@konfy/graphql-mongo-query.svg)](https://www.npmjs.com/package/@konfy/graphql-mongo-query)

Parse GraphQL Input arguments to MongoDB query filters. For use in GraphQL resolvers.

## What does it do?

This small package helps with converting GraphQL `Input` arguments  to MongoDB filters, following a certain convention. It supports:

-   logical queries (`$or` `$and` `$nor`,`$not`,`$all`)
-   comparative queries (`$ne` `$in` `$nin`, `$lt`, `$lte`, `$gt`, `$gte`)
-   Javascript entities like `RegExp` and `Date`
-   Embedded object queries like: `{"embedded.level1.level2": 10}`

And combinations of the above.

## Convention:

By default, this parser assumes a simple structural convention for writing your `Input` arguments, which resembles mongoDB query format as closely as possible:

1.  write mongo keywords like so:

    `_OR`  will parse to: `$or`

	`_NIN` will parse to: `$nin` etc.

2.  Use special keywords for Javascript entities like so:

    `{_REGEX: {exp: 'expression', flag: 'i'}}` will parse to: `RegExp('epxression', 'i')`

3.  Use nested objects for embedded queries, like so:

    `{ nested: { level1: { level2: { _NE: 10 } } } }` will parse to: `{ 'nested.level1.level2': { $ne: 10 } }`

## Usage:

**IMPORTANT:**

Since version 2 this package is a pure function by default. If you want to use the deprecated class syntax, you can import it from `graphql-mongo-query/class`

**since 2.0.0**

```javascript
import GQLMongoQuery from 'graphql-mongo-query'
// Example arguments:
const args = { _OR: [{ num: 10 }, { date: { _DATE: '2018' } }] }

const parser = GQLMongoQuery(<keywords?>, <values?>, <merge?>)
const MongoFilters = parser(args)

// MongoFilters will equal to:
// {$or: [ { num: 10 }, { date: new Date('2018') } ]}
```

**before 2.0.0**

```javascript
import GQLMongoQuery from 'graphql-mongo-query/class'
// Example arguments:
const args = { _OR: [{ num: 10 }, { date: { _DATE: '2018' } }] }

const parser = new GQLMongoQuery(<keywords?>, <values?>, <merge?>)
const MongoFilters = parser.buildFilters(args)

// MongoFilters will equal to:
// {$or: [ { num: 10 }, { date: new Date('2018') } ]}
```



## Options:

`graphql-mongo-query` takes options to customize your keywords and special value entities (like Regex or Dates). All options are optional. By default, they will be merged with defaults.

#### `keywords` (optional)

Maps the arg keywords to mongo keywords.

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

#### `values` (optional)

An object of value functions taking `arg` argument. Each function should return a mongoDB valid value.

```javascript
// Example:
{
	_EXACT(parent) {
		return parent._EXACT
	},
	_REGEX(parent) {
		if (!parent._REGEX.exp) throw new Error('_REGEX object must contain exp property')
		return RegExp(parent._REGEX.exp, parent._REGEX.flag)
	},
	_DATE(parent) {
		return new Date(parent._DATE)
	}
}
```
The parser will iterate through args, and when finding a keyword in a given arg, it will convert the entire arg  according to the function. Note that the order matters, so if the parser will find `_REGEX` key, it will convert that arg into a `RegExp` without further scanning for other keywords.

#### `merge` (optional, default: `true`)

If set to true, `keywords` and `values` from options will be merged with defaults. Otherwise they will overwrite the defaults.

## Examples:

For examples checkout the [tests](https://github.com/jfcieslak/graphql-mongo-query/blob/master/tests/index.test.ts)

An example of a complex Input filter and it’s parsed value:

```javascript
// arg received from graphQL input:
const values = {
    _DATE(parent) {
        return new Date(parent._DATE)
    }
}
const args = {
	_OR: [
		{ field1: { _NE: 'not me' } },
		{ field2: { _IN: ['A', 'B'] } }
	],
	nested: { level1: { level2: { _NE: 10 } } },
	dateField: { _DATE: '2018-02-20' }
}

// Parsed filter:
const filter = GQLMongoQuery(null, values)(args)
expect(filter).toEqual({
	$or: [
		{ field1: { $ne: 'not me' } },
		{ field2: { $in: ['A', 'B'] } }
	],
	'nested.level1.level2': { $ne: 10 },
	dateField: new Date('2018-02-20')
})
```
