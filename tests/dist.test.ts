import GMQ from '../dist'

const parser = new GMQ()

test('Flat computed values', () => {
	const values = {
		test1(parent) {
			parent.test1 = true
			return parent
		},
		'nested.a'(parent) {
			parent['nested.a'] = true
			return parent
		},
		'nested.b'(parent) {
			parent['nested.b'] = parent['nested.b'].n * parent['nested.b'].n
			return parent
		},
		'nested.date'(parent) {
			parent['nested.date'] = new Date(parent['nested.date'])
			return parent
		},
		'nested.rename'(parent) {
			parent.newname = parent['nested.rename']
			delete parent['nested.rename']
			return parent
		}
	}
	const arg = {
		test1: 'something',
		logical: {
			_OR: [1, 2]
		},
		nested: {
			a: 'aaa',
			b: { n: 5 },
			c: 'normal',
			date: '2020',
			rename: 'dickpics'
		},
		_GT: 5,
		_NIN: [1, 2],
		arr: [1, 2, 3],
		_OR: [{ a: 5 }, { b: true }],
		_AND: [{ nested: { a: 'aaa' } }, { b: true }]
	}

	const filter = new GMQ(null, values).buildFilters(arg)
	expect(filter).toEqual({
		test1: true,
		logical: { $or: [1, 2] },
		'nested.a': true,
		'nested.b': 25,
		'nested.c': 'normal',
		'nested.date': new Date('2020'),
		newname: 'dickpics',
		$gt: 5,
		$nin: [1, 2],
		arr: [1, 2, 3],
		$or: [{ a: 5 }, { b: true }],
		$and: [{ 'nested.a': true }, { b: true }]
	})
})