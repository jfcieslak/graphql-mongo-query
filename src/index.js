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

const nested = {
	'address.street': 'String',
	'address.zip': /regex/,
	'address.aa.bb': 1
}

function buildFilters(args) {
	const directTypes = ['string', 'number', 'boolean']
	const keywords = {
		logic: { _OR: '$or', _AND: '$and', _NOR: '$nor' },
		compare: { _NE: '$ne', _IN: '$in', _NIN: '$nin', _ALL: '$all' },
		value: { _REGEX: '$regex', _DATE: '$date' }
	}
	function parseEmbedded(key, val, lastResult = {}) {
		let result = lastResult
		for (let k in val) {
			const subkey = key + '.' + k
			const subval = val[k]
			const finalVal = buildFilters(subval)
			console.log(subkey, subval, !!finalVal)
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
		const isFilterValue =
			checkForKeywords(keywords.value) || ~directTypes.indexOf(typeof val)

		// LOGICAL
		if (isFilterLogic && Array.isArray(val)) {
			const kw = keywords.logic
			for (let k in kw) {
				if (key === k)
					filters[kw[k]] = val.map(orArgs => buildFilters(orArgs))
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
			filters = { ...filters, ...parseEmbedded(key, val) }
		}
	}
	return filters
}

const filters = buildFilters(args)
console.log(filters)

const stringFilters = {
	str1: 'String',
	str2: /regex/,
	str3: { $ne: 'String' }, // equals not Element
	str4: { $in: ['String', /regex/i] }, // equals any of the Elements
	str5: { $nin: ['String', /regex/i] } // equals none of the Elements
}

const stringArrayFilters = {
	arr1: 'String', // contains exact STRING
	arr2: /regex/, // contains REGEX
	arr3: { $ne: 'String' }, // contains no Element
	arr4: { $in: ['String', /regex/i] }, // contains any of the Elements
	arr5: { $nin: ['String', /regex/i] }, // contains none of the Elements
	arr6: { $all: ['String', /regex/i] } // contains all of the Elements
}

const numericFilters = {
	// Including: Int, Float, Date, etc
	num1: 12,
	num2: { $ne: 12 },
	num3: { $gt: 12 },
	num4: { $gte: 12 },
	num5: { $lt: 12 },
	num6: { $lte: 12 },
	num7: { $in: [12, 14] },
	num8: { $nin: [12, 14] }
}

const numericArrayFilters = {
	num1: 12,
	num2: { $ne: 12 },
	num3: { $gt: 12 },
	num4: { $gte: 12 },
	num5: { $lt: 12 },
	num6: { $lte: 12 },
	num7: { $in: [12, 14] },
	num8: { $nin: [12, 14] },
	num9: { $all: [12, 14] }
}
