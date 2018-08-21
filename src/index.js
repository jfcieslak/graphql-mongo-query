import GQLMongoFilters from './GQLMongoFilters'

const args = {
	str1: 'abcd',
	_OR: [{ num: 10 }, { date: { _DATE: '2018' } }],
	str2b: { _REGEX: 'regex', _FLAG: 'i' },
	str3: { _NE: 'String' },
	str3a: { _NE: { _REGEX: 'regex', _FLAG: 'i' } },
	str3b: { _NE: ['String', { _REGEX: 'regex', _FLAG: 'i' }] },
	str4: { _IN: ['option A', 10, { _REGEX: 'regex' }] },
	str5: { _NIN: ['option C', 'option D'] },
	adress: {
		street: 'String',
		zip: { _REGEX: 'regex' },
		aa: { bb: { cc: { dd: { _NE: 1 } } } },
		xx: { _OR: ['A', 'B'] }
	}
}

const filters = new GQLMongoFilters().buildFilters(args)

console.log(filters)
