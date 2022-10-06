import {
    GraphQLErrorWithInfo,
    GraphQLServerRequest,
    GraphQLServerResponse,
    Logger
} from '..'
import {
    ExecutionResult,
    GraphQLError,
    GraphQLFormattedError
} from 'graphql'

/**
 * Interface for ResponseHandler.
 * Provides logic to send a server response and handle different error responses
 */
export interface ResponseHandler {
    readonly methodNotAllowedError: GraphQLErrorWithInfo
    readonly invalidSchemaError: GraphQLErrorWithInfo
    readonly missingQueryParameterError: GraphQLErrorWithInfo
    readonly onlyQueryInGetRequestsError: GraphQLErrorWithInfo

    /** Sends a response */
    sendResponse(responseParameters: ResponseParameters): void

    /** Sends an error response */
    sendErrorResponse(error: GraphQLErrorWithInfo, responseParameters: ResponseParameters): void
}

export interface ResponseParameters {
    readonly response: GraphQLServerResponse,
    readonly request?: GraphQLServerRequest,
    readonly context: unknown,
    readonly logger: Logger
    readonly formatErrorFunction: (error: GraphQLError) => GraphQLFormattedError
    readonly customHeaders?: Record<string, string>,
    readonly executionResult?: ExecutionResult,
    readonly statusCode?: number,
}
