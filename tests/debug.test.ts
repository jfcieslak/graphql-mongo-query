import GMQ from '../src'

const parser = new GMQ()

test('Single depth custom value', () => {
    const values = {
        test(parent) {
            parent.test = true
            return parent
        },
        test2(parent) {
            parent.test2 = true
            return parent
        }
    }
    const arg = { test: 'dicks!', test2: false }

    const filter = new GMQ(null, values).buildFilters(arg)
    expect(filter).toEqual(
        { test: true, test2: true }
    )
})

