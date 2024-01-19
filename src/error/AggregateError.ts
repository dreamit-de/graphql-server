import { GraphQLError } from 'graphql'

export interface AggregateError extends Error {
    errors: GraphQLError[]
}

export function isAggregateError(object: object): object is AggregateError {
    return 'errors' in object
}
