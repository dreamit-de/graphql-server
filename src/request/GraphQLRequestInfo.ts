import {GraphQLErrorWithStatusCode} from '..'

export interface GraphQLRequestInfo {
    query?: string
    variables?: Readonly<Record<string, unknown>>
    operationName?: string
    error?: GraphQLErrorWithStatusCode
}
