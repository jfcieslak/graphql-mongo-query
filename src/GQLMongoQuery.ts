interface Keywords {
	logic: object
	compare: object
}

export default class GQLMongoQuery {
	directTypes: string[]
	keywords: Keywords
	values: object

	constructor(keywords, values) {
		const defaultKeywords = {
			logic: { _OR: '$or', _AND: '$and', _NOR: '$nor' },
			compare: { _NE: '$ne', _IN: '$in', _NIN: '$nin', _ALL: '$all' }
		}
		const defaultValues = {
			_EXACT(args) {
				return args._EXACT
			},
			_REGEX(args) {
				return RegExp(args._REGEX, args._FLAG)
			},
			_FLAG(args) {
				if (!args._REGEX)
					throw new Error('_FLAG can only be used together with _REGEX filter.')
				return RegExp(args._REGEX, args._FLAG)
			},
			_DATE(args) {
				return new Date(args._DATE)
			}
		}
		this.keywords = { ...defaultKeywords, ...keywords }
		this.values = { ...defaultValues, ...values }
		this.directTypes = ['string', 'number', 'boolean']
	}

	private isLogicFilter(key, val) {
		return ~Object.keys(this.keywords.logic).indexOf(key) && Array.isArray(val)
	}

	private isCompareFilter(key) {
		return ~Object.keys(this.keywords.compare).indexOf(key)
	}

	private isValue(val) {
		if (~this.directTypes.indexOf(typeof val)) return true
		else if (typeof val === 'object') {
			let isValue = false
			for (const k in val) {
				if (~Object.keys(this.values).indexOf(k)) isValue = true
			}
			return isValue
		} else return false
	}

	private argType(key, val) {
		if (this.isLogicFilter(key, val)) return 'LOGIC'
		else if (this.isCompareFilter(key)) return 'COMPARE'
		else if (this.isValue(val)) return 'VALUE'
		else if (typeof val === 'object') {
			let isEmbedded = false
			for (const k in val) {
				if (
					!this.isLogicFilter(k, val[k]) &&
					!this.isCompareFilter(k) &&
					!this.isValue(val[k])
				) {
					isEmbedded = true
					break
				}
			}
			if (isEmbedded) return 'EMBEDDED'
			else return null
		} else return null
	}

	private parseEmbedded(key, val, lastResult = {}) {
		const result = lastResult
		for (const k in val) {
			const subkey = key + '.' + k
			const subval = val[k]
			let isFinal = false
			for (const sk in subval) {
				const t = this.argType(sk, subval)
				if (t !== 'EMBEDDED') {
					isFinal = true
					break
				}
			}
			if (isFinal) result[subkey] = this.buildFilters(subval)
			else this.parseEmbedded(subkey, subval, result)
		}
		return result
	}

	buildFilters(args) {
		// DIRECT VALUES
		if (~this.directTypes.indexOf(typeof args)) {
			return args
		}
		// COMPUTED VALUES
		else if (this.isValue(args)) {
			for (const valueKey in this.values) {
				if (args[valueKey]) {
					return this.values[valueKey](args)
				}
			}
		}
		// COMPOUND FILTERS
		let filters = {}

		for (const key in args) {
			const val = args[key]
			const t = this.argType(key, val)
			// LOGICAL FILTER
			if (t === 'LOGIC') {
				const kw = this.keywords.logic
				for (const k in kw) {
					if (key === k) filters[kw[k]] = val.map(v => this.buildFilters(v))
				}
			}
			// COMPARISON FILTER
			else if (t === 'COMPARE') {
				const kw = this.keywords.compare
				for (const k in kw) {
					if (key === k) {
						if (Array.isArray(val))
							filters[kw[k]] = val.map(v => this.buildFilters(v))
						else filters[kw[k]] = this.buildFilters(val)
					}
				}
			}
			// EMBEDED QUERY
			else if (t === 'EMBEDDED') {
				filters = { ...filters, ...this.parseEmbedded(key, val) }
			}
			// go deeper
			else {
				filters[key] = this.buildFilters(val)
			}
		}
		return filters
	}
}
