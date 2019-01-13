import GMQ from '../src'

const parser = new GMQ()

test('Complex Query', () => {
    const arg = {
        _OR: [{ field1: { _NE: 'not me' } }, { field2: { _IN: ['A', 'B'] } }],
        nested: { level1: { level2: { _NE: 10 } } },
        dateField: { _DATE: '2018-02-20' }
    }
    const filter = parser.buildFilters(arg)
    expect(filter).toEqual({
        $or: [{ field1: { $ne: 'not me' } }, { field2: { $in: ['A', 'B'] } }],
        'nested.level1.level2': { $ne: 10 },
        dateField: new Date('2018-02-20')
    })
})
