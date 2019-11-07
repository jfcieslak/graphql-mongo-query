import parseQuery, { Values } from '../src/'

const values: Values = {
	test1(parent) {
		return {test1: !!parent.test1}
	},
	'nested.a'() {
		return {['nested.a']: true}
	},
	'nested.b'(parent) {
		parent['nested.b'] = parent['nested.b'].n * parent['nested.b'].n
		return parent
	},
	'nested.date'(parent) {
		return { 'nested.date': new Date(parent['nested.date']) }
	},
	'nested.rename'(parent) {
		const newname = parent['nested.rename']
		delete parent['nested.rename']
		return {newname}
	}
}

const args = {
	test1: 'something',
	logical: {
		_OR: [1, 2]
	},
	nested: {
		a: 'aaa',
		b: { n: 5 },
		c: 'normal',
		date: '2020',
		rename: 'dickpics',
		deep: {
			deepkey: 'hidden'
		},
		superdeep: {
			super: {
				deep: 'key'
			}
		}
	},
	_GT: 5,
	_NIN: [1, 2],
	arr: [1, 2, 3],
	_OR: [{ a: 5 }, { b: true }],
	_AND: [{ nested: { a: 'aaa' } }, { b: true }]
}

test('functional', () => {
	const parser = parseQuery(null, values)
	const filter = parser(args)
	expect(filter).toEqual({
		test1: true,
		logical: { $or: [1, 2] },
		'nested.a': true,
		'nested.b': 25,
		'nested.c': 'normal',
		'nested.date': new Date('2020'),
		'nested.deep.deepkey': 'hidden',
		'nested.superdeep.super.deep': 'key',
		newname: 'dickpics',
		$gt: 5,
		$nin: [1, 2],
		arr: [1, 2, 3],
		$or: [{ a: 5 }, { b: true }],
		$and: [{ 'nested.a': true }, { b: true }]
	})
})