const defaultKeywords = {
	_OR: '$or',
	_AND: '$and',
	_NOR: '$nor',
	_ALL: '$all',
	_IN: '$in',
	_NIN: '$nin',
	_EQ: '$eq',
	_NE: '$ne',
	_LT: '$lt',
	_LTE: '$lte',
	_GT: '$gt',
	_GTE: '$gte',
	// geo queries operators:
	_GEO_INTERSECTS: '$geoIntersects',
	_GEO_WITHIN: '$geoWithin',
	// geo shapes operators:
	_BOX: '$box',
	_POLYGON: '$polygon',
	_CENTER: '$center',
	_CENTERSPHERE: '$centerSphere'
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

export default class GQLMongoQuery {
	directTypes: string[]
	keywords: object
	values: object

	constructor(keywords = defaultKeywords, values = defaultValues) {
		this.keywords = keywords
		this.values = values
		this.directTypes = ['string', 'number', 'boolean']
	}

	private isOperator(key) {
		return ~Object.keys(this.keywords).indexOf(key)
	}

	private isValue(val) {
		if (~this.directTypes.indexOf(typeof val)) return true
		else if (typeof val === 'object') {
			let isValue = false
			for (const k in val) {
				if (~Object.keys(this.values).indexOf(k)) isValue = true
			}
			return isValue
		}
		else return false
	}

	private isEmbeded(val) {
		if (typeof val === 'object') {
			let isEmbedded = false
			for (const k in val) {
				if (
					!this.isOperator(k) &&
					!this.isValue(val[k])
				) {
					isEmbedded = true
					break
				}
			}
			return isEmbedded
		}
		else return false	
	}

	private argType(key, val) {
		if (this.isOperator(key)) return 'OPERATOR'
		else if (this.isValue(val)) return 'VALUE'
		else if (this.isEmbeded(val)) return 'EMBEDDED'
		else return null
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
		let filters = {}

		for (const key in args) {
			const val = args[key]
			const t = this.argType(key, val)
	
			// OPERATORS
			if (t === 'OPERATOR') {
				const kw = this.keywords
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
