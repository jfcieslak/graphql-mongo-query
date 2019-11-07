export type ArgType = 'OPERATOR' | 'COMPUTED' | 'PRIMITIVE' | 'ARRAY' | 'NESTED' | 'FLAT'

export type Resolver = (parent: any) => any

export interface Resolvers {
	[key: string]: Resolver
}

export interface Keywords {
	[key: string]: string
}

const defaultKeywords: Keywords = {
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
const defaultValues: Resolvers = {}

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
	keywords: Keywords
	resolvers: Resolvers

	constructor(
		keywords: Keywords = defaultKeywords,
		resolvers: Resolvers = defaultValues,
		merge: boolean = true
	) {
		this.keywords = merge ? { ...defaultKeywords, ...keywords } : keywords
		this.resolvers = merge ? { ...defaultValues, ...resolvers } : resolvers
	}

	private isOperator(key): boolean {
		return Object.keys(this.keywords).includes(key)
	}

	private isPrimitive(val): boolean {
		if (primitives.includes(typeof val)) return true
		else return false
	}

	private isComputable(key): boolean {
		return Object.keys(this.resolvers).includes(key)
	}

	private isNested(obj): boolean {
		if (typeof obj !== 'object') return false
		let isNested = false
		for (const k in obj) {
			if (!this.isOperator(k) && !this.isPrimitive(obj[k]) && !this.isComputable(k)) {
				isNested = true
				break
			}
		}
		return isNested
	}

	private computedValue(args) {
		for (const valueKey in this.resolvers) {
			if (args[valueKey] !== undefined) {
				return this.resolvers[valueKey](args)
			}
		}
	}

	private argType(key?, val?): ArgType {
		if (this.isOperator(key)) return 'OPERATOR'
		else if (this.isComputable(key)) return 'COMPUTED'
		else if (this.isPrimitive(val)) return 'PRIMITIVE'
		else if ( Array.isArray(val) ) return 'ARRAY'
		else if (this.isNested(val)) return 'NESTED'
		else if (typeof val === 'object') return 'FLAT'
		else return null
	}

	private parseNested(key, val, lastResult = {}) {

		if (this.isComputable(key)) {
			return this.buildFilters(val, key)
		}
		let result = lastResult

		for (const k in val) {
			let isFinal = false

			// COMPUTABLE VALUE
			if (this.isComputable(k)) {
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
			if (this.isComputable(subkey)) {
				result = { ...result, ...this.buildFilters(subval, subkey) }
				isFinal = true
			}

			// subval is a PRIMITIVE
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
		if (this.isComputable(parentKey)) {
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
			if (this.isComputable(key)) {
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
