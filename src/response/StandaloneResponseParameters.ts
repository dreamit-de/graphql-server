import type {
    GraphQLExecutionResult,
    GraphQLServerRequest,
    Logger,
} from '@dreamit/graphql-server-base'
import type { GraphQLError, GraphQLFormattedError } from 'graphql'

export interface StandaloneResponseParameters {
    readonly context: Record<string, unknown>
    readonly executionResult?: GraphQLExecutionResult
    readonly logger: Logger
    readonly formatErrorFunction: (error: GraphQLError) => GraphQLFormattedError
    readonly request?: GraphQLServerRequest
}
