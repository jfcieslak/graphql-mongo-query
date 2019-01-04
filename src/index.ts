const defaultKeywords: object = {
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
	_NEAR: '$near',
	_NEAR_SPHERE: '$nearSphere',
	// geo shapes operators:
	_GEOMETRY: '$geometry',
	_BOX: '$box',
	_POLYGON: '$polygon',
	_CENTER: '$center',
	_CENTER_SPHERE: '$centerSphere',
	_MAX_DISTANCE: '$maxDistance',
	_MIN_DISTANCE: '$minDistance'
}
const defaultValues: object = {
	_EXACT(args) {
		return args._EXACT
	},
	_REGEX(args) {
		if (!args._REGEX.exp) throw new Error('_REGEX object must contain exp property')
		return RegExp(args._REGEX.exp, args._REGEX.flag)
	},
	_DATE(args) {
		return new Date(args._DATE)
	}
}

export default class GQLMongoQuery {
	directTypes: string[]
	keywords: object
	values: object

	constructor(
		keywords: object = defaultKeywords,
		values: object = defaultValues,
		merge: boolean = true
	) {
		this.keywords = merge ? { ...defaultKeywords, ...keywords } : keywords
		this.values = merge ? { ...defaultValues, ...values } : values
		this.directTypes = ['string', 'number', 'boolean']
	}

	private isOperator(key) {
		return Object.keys(this.keywords).includes(key)
	}

	private isValue(val) {
		if (this.directTypes.includes(typeof val)) return true
		else if (typeof val === 'object') return this.isComputableValue(val)
		else return false
	}

	private isComputableValue(val) {
		let isValue = false
		for (const k in val) {
			if (Object.keys(this.values).includes(k)) isValue = true
		}
		return isValue
	}

	private computedValue(args) {
		for (const valueKey in this.values) {
			if (args[valueKey]) return this.values[valueKey](args)
		}
	}

	private isEmbeded(val) {
		if (typeof val === 'object') {
			let isEmbedded = false
			for (const k in val) {
				if (!this.isOperator(k) && !this.isValue(val[k])) {
					isEmbedded = true
					break
				}
			}
			return isEmbedded
		} else return false
	}

	private argType(key?, val?) {
		if (this.isOperator(key)) return 'OPERATOR'
		else if (this.isValue(val)) return 'VALUE'
		else if (this.isEmbeded(val)) return 'EMBEDDED'
		else return null
	}

	private parseEmbedded(key, val, lastResult = {}) {
		let result = lastResult
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
			if (isFinal) {
				result[subkey] = this.buildFilters(subval)
				if (this.isComputableValue(result)) {
					result = {...result, ...this.computedValue(result)}
				}
			}
			else this.parseEmbedded(subkey, subval, result)
		}
		return result
	}

	buildFilters(args) {
		// DIRECT VALUES
		if (this.directTypes.includes(typeof args)) {
			return args
		}
		// COMPUTED VALUES
		else if (this.isValue(args)) {
			return this.computedValue(args)
		}

		let filters

		for (const key in args) {
			const val = args[key]
			const t = this.argType(key, val)

			// OPERATORS
			if (t === 'OPERATOR') {
				if (!filters) filters = {}
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
			// Else: go deeper
			else {
				if (Array.isArray(args)) {
					if (!filters) filters = []
					filters = [...filters, this.buildFilters(val)]
				}
				else {
					if (!filters) filters = {}
					filters[key] = this.buildFilters(val)
				}
			}
		}
		return filters
	}
}
