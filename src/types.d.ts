export type ArgType = 'OPERATOR' | 'COMPUTED' | 'PRIMITIVE' | 'ARRAY' | 'NESTED' | 'FLAT'

export type ValueParser = (parent: any) => any

export interface Values {
	[key: string]: ValueParser
}

export interface Keywords {
	[key: string]: string
}
