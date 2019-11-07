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
const defaultValues: object = {}

const primitives = [
	'string',
	'number',
	'boolean',
	'bigint',
	'undefined',
	'null',
	'symbol'
]

export default class GQLMongoQuery {
	keywords: object
	values: object

	constructor(
		keywords: object = defaultKeywords,
		values: object = defaultValues,
		merge: boolean = true
	) {
		this.keywords = merge ? { ...defaultKeywords, ...keywords } : keywords
		this.values = merge ? { ...defaultValues, ...values } : values
	}

	private isOperator(key): boolean {
		return Object.keys(this.keywords).includes(key)
	}

	private isPrimitive(val): boolean {
		if (primitives.includes(typeof val)) return true
		else return false
	}

	private isComputableValue(key): boolean {
		return Object.keys(this.values).includes(key)
	}

	private isNested(obj): boolean {
		if (typeof obj !== 'object') return false
		let isNested = false
		for (const k in obj) {
			if (!this.isOperator(k) && !this.isPrimitive(obj[k]) && !this.isComputableValue(k)) {
				isNested = true
				break
			}
		}
		return isNested
	}

	private computedValue(args) {
		for (const valueKey in this.values) {
			if (args[valueKey] !== undefined) {
				return this.values[valueKey](args)
			}
		}
	}

	private argType(key?, val?) {
		if (this.isOperator(key)) return 'OPERATOR'
		else if (this.isComputableValue(key)) return 'COMPUTED'
		else if (this.isPrimitive(val)) return 'VALUE'
		else if ( Array.isArray(val) ) return 'ARRAY'
		else if (this.isNested(val)) return 'NESTED'
		else if (typeof val === 'object') return 'FLAT'
		else return null
	}

	private parseNested(key, val, lastResult = {}) {

		if (this.isComputableValue(key)) {
			return this.buildFilters(val, key)
		}
		let result = lastResult

		for (const k in val) {
			let isFinal = false

			// COMPUTABLE VALUE
			if (this.isComputableValue(k)) {
				result = { ...result, ...this.buildFilters(val[k], k) }
				return result
			}

			// OPERATOR
			if (this.isOperator(k)) {
				result = { ...result, [key]: this.buildFilters(val, key) }
				return result
			}

			const subkey = key + '.' + k
			const subval = val[k]

			// subval is COMPUTABLE VALUE
			if (this.isComputableValue(subkey)) {
				result = { ...result, ...this.buildFilters(subval, subkey) }
				isFinal = true
			}

			// subval is a DIRECT VALUE
			else if (this.isPrimitive(subval)) {
				result[subkey] = this.buildFilters(subval)
				isFinal = true
			}

			// subval is NESTED
			else for (const sk in subval) {
				const t = this.argType(sk, subval)
				if (t !== 'NESTED' && t !== 'FLAT') {
					result[subkey] = this.buildFilters(subval)
					isFinal = true
					break
				}
			}
			if (!isFinal) this.parseNested(subkey, subval, result)
		}
		return result
	}

	buildFilters(args, parentKey?) {

		// PARENT IS A COMPUTABLE VALUE
		if (this.isComputableValue(parentKey)) {
			return this.computedValue({ [parentKey]: args })
		}

		// NO PARENT AND ARGS IS A DIRECT VALUE
		if (!parentKey && this.isPrimitive(args)) {
			return args
		}

		// ELSE, ARGS MUST BE ON OBJECT. LET'S ITERATE:
		let filters

		for (const key in args) {

			if (!filters) filters = {}
			const val = args[key]
			const t = this.argType(key, val)

			// COMPUTED VALUE
			if (this.isComputableValue(key)) {
				const computed = this.buildFilters(val, key)
				filters = {
					...filters, ...computed
				}
			}
			// OPERATOR
			else if (t === 'OPERATOR') {
				const keyword = this.keywords[key]
				if (Array.isArray(val)) {
					filters[keyword] = val.map(v => this.buildFilters(v))
				}
				else {
					filters[keyword] = this.buildFilters(val)
				}
			}
			// NESTED QUERY
			else if (t === 'NESTED' || t === 'FLAT') {
				filters = { ...filters, ...this.parseNested(key, val) }
			}
			// ARRAY
			else if (t === 'ARRAY') {
				filters[key] = val.map(v => this.buildFilters(v))
			}
			// ELSE
			else {
				filters[key] = this.buildFilters(val)
			}
		}
		return filters
	}
}
