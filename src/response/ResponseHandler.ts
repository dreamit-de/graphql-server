import {
    GraphQLExecutionResult,
    GraphQLServerRequest,
    GraphQLServerResponse,
    Logger
} from '@sgohlke/graphql-server-base'
import {
    ExecutionResult,
    GraphQLError,
    GraphQLFormattedError
} from 'graphql'

/**
 * Interface for ResponseHandler.
 * Provides logic to send a server response
 */
export interface ResponseHandler {
    readonly methodNotAllowedResponse: GraphQLExecutionResult
    readonly invalidSchemaResponse: GraphQLExecutionResult
    readonly missingQueryParameterResponse: GraphQLExecutionResult
    readonly onlyQueryInGetRequestsResponse: GraphQLExecutionResult

    /** Sends a response */
    sendResponse(responseParameters: ResponseParameters): void
}

export interface ResponseParameters {
    readonly response: GraphQLServerResponse,
    readonly context: unknown,
    readonly logger: Logger
    readonly formatErrorFunction: (error: GraphQLError) => GraphQLFormattedError
    readonly request?: GraphQLServerRequest,
    readonly customHeaders?: Record<string, string>,
    readonly executionResult?: ExecutionResult,
    readonly statusCode?: number,
}
