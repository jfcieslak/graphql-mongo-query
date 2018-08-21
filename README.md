# graphql-mongo-query

Parse GraphQL Input arguments to MongoDB query filters. For use in GraphQL resolvers.

#### What it does?

This small package helps with converting GraphQL `Input` arguments  to MongoDB filters, following a certain convention. It supports:

-   logical queries (`$or` `$and` `$nor`)
-   comparative queries (`$ne` `$in` `$nin` `$all`)
-   Javascript entities like `RegExp` and `Date`
-   Embedded object queries like: `{"embedded.level1.level2": 10}`

And combinations of the above.

#### Convention:

By default, this parser assumes a simple structural convention for writing your `Input` arguments, which resembles mongoDB query format as closely as possible:

1.  write mongo keywords like so: 
     `_OR`  = `$or` |  `_NIN` = `$nin` , etc.

2.  Use special keywords for Javascript entities like so:

    `RegExp('epxression', 'i')` = `{_REGEX: 'expression', _FLAG: 'i'}`

3.  Use nested objects for embedded queries, like so:

    `{ nested: { level1: { level2: { _NE: 10 } } } }` = `{ 'nested.level1.level2': { $ne: 10 } }`

#### Usage:

```javascript
import GQLMongoQuery from 'graphql-mongo-query'
const parser = new GQLMongoQuery(<keywords?>, <values?>)

// Example arguments:
const args = { _OR: [{ num: 10 }, { date: { _DATE: '2018' } }] }

const MongoFilters = parser.buildFilters(arg)

// Will result in:
// {$or: [ { num: 10 }, { date: new Date('2018') } ]}
```

#### Options:

`graphql-mongo-query` takes options to customize your keywords and special value entities (like Regex or Dates). All options are optional. they will be merged with defaults.

##### `keywords` (optional)

Maps the arg keywords to mongo keywords.

```javascript
// Defaults:
{
	logic: { _OR: '$or', _AND: '$and', _NOR: '$nor' },
	compare: { _NE: '$ne', _IN: '$in', _NIN: '$nin', _ALL: '$all' }
}
```

##### `values` (optional)

An object of value functions taking `arg` argument. Each function should return a mongoDB valid value.

```javascript
// Defaults:
{
    _EXACT(arg) {
  		return arg._EXACT
    },
    _REGEX(arg) {
   		return RegExp(arg._REGEX, arg._FLAG)
    },
	_FLAG(arg) {
		if (!arg._REGEX)
			throw new Error('_FLAG can only be used together with _REGEX filter.')
		return RegExp(arg._REGEX, arg._FLAG)
	},
	_DATE(arg) {
		return new Date(arg._DATE)
	}
}
```

The parser will iterate through args, and when finding a keyword in a given arg, it will convert the entire arg  according to the function. Note that the order matters, so if the parser will find `_REGEX` key, it will convert the arg into a `RegExp` without further scanning it for other keywords.

#### Examples

For examples checkout the [tests](https://github.com/jfcieslak/graphql-mongo-query/blob/master/tests/index.test.ts)

