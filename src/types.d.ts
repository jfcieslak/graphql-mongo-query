export type ArgType = 'OPERATOR' | 'COMPUTED' | 'VALUE' | 'ARRAY' | 'NESTED' | 'FLAT'

export type ValueParser = (parent: any) => any

export interface Values {
	[key: string]: ValueParser
}

export interface Keywords {
	[key: string]: string
}
