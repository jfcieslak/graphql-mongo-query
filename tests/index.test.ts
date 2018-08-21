import GQLMongoQuery from '../src'

const parser = new GQLMongoQuery()

describe('Parses GraphQL input arguments to MongoDB query filters', () => {

	test('String', () => {
		const arg = { str: 'abcd 123' }
		const filter = parser.buildFilters(arg)
		expect(filter).toEqual(arg)
	})

	test('Number', () => {
		const arg = { num: 20 }
		const filter = parser.buildFilters(arg)
		expect(filter).toEqual(arg)
	})

	test('Logical: OR', () => {
		const arg = { _OR: [{ num: 10 }, { date: { _DATE: '2018' } }] }
		const filter = parser.buildFilters(arg)
		expect(filter).toEqual({
			$or: [
				{ num: 10 },
				{ date: new Date('2018') }
			]
		})
	})

	test('Regex with flags', () => {
		const arg = { regex: { _REGEX: '^fuzzy', _FLAG: 'i' } }
		const filter = parser.buildFilters(arg)
		expect(filter).toEqual(
			{regex: RegExp('^fuzzy','i')}
		)
	})

	test('Compare: NOT EQUAL', () => {
		const arg = { compare_ne: { _NE: 'not me' } }
		const filter = parser.buildFilters(arg)
		expect(filter).toEqual(
			{ compare_ne: { $ne: 'not me' } }
		)
	})

	test('Compare: NOT EQUAL REGEX', () => {
		const arg = { compare_ne_regex: { _NE: { _REGEX: 'fuzzy$', _FLAG: 'i' } } }
		const filter = parser.buildFilters(arg)
		expect(filter).toEqual(
			{ compare_ne_regex: { $ne: RegExp('fuzzy$', 'i') } }
		)
	})

	test('Compare: IN ARRAY', () => {
		const arg = { compare_in: { _IN: ['option A', 10, { _REGEX: 'fuzzy' }] } }
		const filter = parser.buildFilters(arg)
		expect(filter).toEqual(
			{ compare_in: { $in: ['option A', 10, RegExp('fuzzy')] }}
		)
	})

	test('Nested Object', () => {
		const arg = { nested: { level1: { level2: { _NE: 10 } } } }
		const filter = parser.buildFilters(arg)
		expect(filter).toEqual(
			{ 'nested.level1.level2': { $ne: 10 } }
		)
	})
})