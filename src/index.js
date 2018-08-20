const args = {
	str1: 'abcd',
	_OR: [{ str1: 10 }, { str2a: { _DATE: '2018' } }],
	str2b: { _REGEX: 'regex', _FLAG: 'i' },
	str3: { _NE: 'String' },
	str3a: { _NE: { _REGEX: 'regex', _FLAG: 'i' } },
	str3b: { _NE: ['String', { _REGEX: 'regex', _FLAG: 'i' }] },
	str4: { _IN: ['option A', 10, { _REGEX: 'regex' }] },
	str5: { _NIN: ['option C', 'option D'] },
	adress: {
		street: 'String',
		zip: { _REGEX: 'regex' },
		aa: { bb: { cc: { _NE: 1 } } }
	}
}

function buildFilters(args) {
	const directTypes = ['string', 'number', 'boolean']
	const keywords = {
		logic: { _OR: '$or', _AND: '$and', _NOR: '$nor' },
		compare: { _NE: '$ne', _IN: '$in', _NIN: '$nin', _ALL: '$all' },
		value: { _REGEX: '$regex', _DATE: '$date' }
	}
	let isEmbedded = false
	function parseEmbedded(key, val, lastResult = {}) {
		let result = lastResult
		for (let k in val) {
			const subkey = key + '.' + k
			const subval = val[k]
			const finalVal = buildFilters(subval)
			console.log(subkey, subval, isEmbedded)
			if (!finalVal) parseEmbedded(subkey, subval, result)
			else result[subkey] = buildFilters(subval)
		}
		return result
	}

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

		function checkForKeywords(kw) {
			for (let k in kw) {
				if (val[k]) return true
			}
			return false
		}

		const isFilterLogic = ~Object.keys(keywords.logic).indexOf(key)
		const isFilterCompare = checkForKeywords(keywords.compare)
		const isFilterValue = checkForKeywords(keywords.value) || ~directTypes.indexOf(typeof val)

		// LOGICAL
		if (isFilterLogic && Array.isArray(val)) {
			const kw = keywords.logic
			for (let k in kw) {
				if (key === k) filters[kw[k]] = val.map(orArgs => buildFilters(orArgs))
			}
		}
		// COMPARE
		else if (isFilterCompare) {
			const kw = keywords.compare
			for (let k in kw) {
				if (val[k]) {
					if (Array.isArray(val[k])) {
						filters[key] = {
							[kw[k]]: val[k].map(v => buildFilters(v))
						}
					} else filters[key] = { [kw[k]]: buildFilters(val[k]) }
				}
			}
		}
		// VALUE
		else if (isFilterValue) {
			filters[key] = buildFilters(args[key])
		}
		// EMBEDED
		else if (typeof val === 'object') {
			isEmbedded = true
			filters = { ...filters, ...parseEmbedded(key, val) }
		}
	}
	return filters
}

const filters = buildFilters(args)
console.log(filters)
