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

const primitives = ['string', 'number', 'boolean', 'bigint', 'undefined', 'null', 'symbol']

const isOperator = (key: string, keywords: object): boolean => {
    return Object.keys(keywords).includes(key)
}

const isPrimitive = (val): boolean => {
    if (primitives.includes(typeof val)) return true
    else return false
}

const isComputableValue = (key: string, values: object): boolean => {
    return Object.keys(values).includes(key)
}

const isNested = (value, keywords: object, values: object): boolean => {
    if (typeof value !== 'object') return false
    let nested = false
    for (const key in value) {
        if (!isOperator(key, keywords)
            && !isPrimitive(value[key])
            && !isComputableValue(key, values)
        ) {
            nested = true
            break
        }
    }
    return nested
}

const computedValue = (args: object, values: object) => {
    for (const valueKey in values) {
        if (args[valueKey] !== undefined) {
            return values[valueKey](args)
        }
    }
}

const argType = (keywords: object, values: object, key?: string, val?: string) => {
    if (isOperator(key, keywords)) return 'OPERATOR'
    else if (isComputableValue(key, values)) return 'COMPUTED'
    else if (isPrimitive(val)) return 'VALUE'
    else if ( Array.isArray(val) ) return 'ARRAY'
    else if (isNested(val, keywords, values)) return 'NESTED'
    else if (typeof val === 'object') return 'FLAT'
    else return null
}

const parseNested = (keywords: object, values: object, key: string, val, lastResult = {}) => {

    if (isComputableValue(key, values)) {
        return buildFilters(val, key, keywords, values)
    }
    let result = lastResult

    for (const k in val) {
        let isFinal = false

        // COMPUTABLE VALUE
        if (isComputableValue(k, values)) {
            result = { ...result, ...buildFilters(val[k], k, keywords, values) }
            return result
        }

        // OPERATOR
        if (isOperator(k, keywords)) {
            result = { ...result, [key]: buildFilters(val, key, keywords, values) }
            return result
        }

        const subkey = key + '.' + k
        const subval = val[k]

        // subval is COMPUTABLE VALUE
        if (isComputableValue(subkey, values)) {
            result = { ...result, ...buildFilters(subval, subkey, keywords, values) }
            isFinal = true
        }

        // subval is a DIRECT VALUE
        else if (isPrimitive(subval)) {
            result[subkey] = buildFilters(subval, null, keywords, values)
            isFinal = true
        }

        // subval is NESTED
        else for (const sk in subval) {
            const t = argType(keywords, values, sk, subval)
            if (t !== 'NESTED' && t !== 'FLAT') {
                result[subkey] = buildFilters(subval, null, keywords, values)
                isFinal = true
                break
            }
        }
        if (!isFinal) parseNested(keywords, values, subkey, subval, result)
    }
    return result
}

const buildFilters = (
	args,
	parentKey?: string,
	customKeywords: object = {},
	customValues: object = {},
	merge: boolean = true,
) => {
	const keywords: object = merge ? { ...defaultKeywords, ...customKeywords } : customKeywords
	const values: object = merge ? { ...defaultValues, ...customValues } : customValues

	// PARENT IS A COMPUTABLE VALUE
	if (isComputableValue(parentKey, values)) {
		return computedValue({ [parentKey]: args }, values)
	}

	// NO PARENT AND ARGS IS A DIRECT VALUE
	if (!parentKey && isPrimitive(args)) {
		return args
	}

	// ELSE, ARGS MUST BE ON OBJECT. LET'S ITERATE:
	let filters

	for (const key in args) {
		if (!filters) filters = {}
		const val = args[key]
		const t = argType(keywords, values, key, val)

		// COMPUTED VALUE
		if (isComputableValue(key, values)) {
			const computed = buildFilters(val, key, keywords, values)
			filters = {
				...filters,
				...computed
			}
		}
		// OPERATOR
		else if (t === 'OPERATOR') {
			const keyword = keywords[key]
			if (Array.isArray(val)) {
				filters[keyword] = val.map(v => buildFilters(v, null, keywords, values))
			} else {
				filters[keyword] = buildFilters(val, null, keywords, values)
			}
		}
		// NESTED QUERY
		else if (t === 'NESTED' || t === 'FLAT') {
			filters = { ...filters, ...parseNested(keywords, values, key, val) }
		}
		// ARRAY
		else if (t === 'ARRAY') {
			filters[key] = val.map(v => buildFilters(v, null, keywords, values))
		}
		// ELSE
		else {
			filters[key] = buildFilters(val, null, keywords, values)
		}
	}
	return filters
}

export default buildFilters