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

const directTypes = ['string', 'number', 'boolean']
const keywords = {
	logic: { _OR: '$or', _AND: '$and', _NOR: '$nor' },
	compare: { _NE: '$ne', _IN: '$in', _NIN: '$nin', _ALL: '$all' },
	value: { _REGEX: '$regex', _FLAG: null, _DATE: '$date' }
}

function isLogicFilter(key, val) {
	return ~Object.keys(keywords.logic).indexOf(key) && Array.isArray(val)
}

function isCompareFilter(key, val) {
	return ~Object.keys(keywords.compare).indexOf(key)
}

function isValue(val) {
	if (~directTypes.indexOf(typeof val)) return true
	else if (typeof val === 'object') {
		let isValue = false
		for (let k in val) {
			if (~Object.keys(keywords.value).indexOf(k)) {
				isValue = true
			}
		}
		return isValue
	}
}

function argType(key, val) {
	if (isLogicFilter(key, val)) return 'LOGIC'
	else if (isCompareFilter(key, val)) return 'COMPARE'
	else if (isValue(val)) return 'VALUE'
	else if (typeof val === 'object') {
		let isEmbedded = false
		for (let k in val) {
			if (!isLogicFilter(k, val[k]) && !isCompareFilter(k, val[k]) && !isValue(val[k])) {
				isEmbedded = true
				break
			}
		}
		if (isEmbedded) return 'EMBEDDED'
	} else return null
}

function parseEmbedded(key, val, lastResult = {}) {
	let result = lastResult
	for (let k in val) {
		const subkey = key + '.' + k
		const subval = val[k]
		let isFinal = false
		for (let sk in subval) {
			const t = argType(sk, subval)
			if (t !== 'EMBEDDED') {
				isFinal = true
				break
			}
		}
		if (isFinal) result[subkey] = buildFilters(subval)
		else parseEmbedded(subkey, subval, result)
	}
	return result
}

function buildFilters(args) {
	// FINAL
	//Direct
	if (~directTypes.indexOf(typeof args)) {
		return args
	}
	// Regex
	else if (args._REGEX) {
		return RegExp(args._REGEX, args._FLAG)
	}
	// Date
	else if (args._DATE) {
		return new Date(args._DATE)
	}

	let filters = {}

	for (let key in args) {
		const val = args[key]
		const t = argType(key, val)
		// LOGICAL
		if (t === 'LOGIC') {
			const kw = keywords.logic
			for (let k in kw) {
				if (key === k) filters[kw[k]] = val.map(v => buildFilters(v))
			}
		}
		// COMPARE
		else if (t === 'COMPARE') {
			const kw = keywords.compare
			for (let k in kw) {
				if (key === k) {
					if (Array.isArray(val)) filters[kw[k]] = val.map(v => buildFilters(v))
					else filters[kw[k]] = buildFilters(val)
				}
			}
		}
		// EMBEDED
		else if (t === 'EMBEDDED') {
			filters = { ...filters, ...parseEmbedded(key, val) }
		}
		// VALUE or go deeper
		else {
			filters[key] = buildFilters(val)
		}
	}
	return filters
}

const filters = buildFilters(args)
console.log(filters)
