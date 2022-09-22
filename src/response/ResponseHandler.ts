import {
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
    readonly methodNotAllowedError: GraphQLError
    readonly invalidSchemaError: GraphQLError
    readonly missingQueryParameterError: GraphQLError
    readonly onlyQueryInGetRequestsError: GraphQLError

    /** Sends a response */
    sendResponse(responseParameters: ResponseParameters): void

    /** Sends a fitting response if the schema used by the GraphQL server is invalid */
    sendInvalidSchemaResponse(responseParameters: ResponseParameters): void

    /** Sends a fitting response if there is no query available in the request */
    sendMissingQueryResponse(responseParameters: ResponseParameters): void

    /** Sends a fitting response if a mutation is requested in a GET request */
    sendMutationNotAllowedForGetResponse(responseParameters: ResponseParameters): void

    /** Sends a fitting response if a method is not allowed */
    sendMethodNotAllowedResponse(responseParameters: ResponseParameters): void
}

export interface ResponseParameters {
    readonly response: GraphQLServerResponse,
    readonly request: GraphQLServerRequest,
    readonly context: unknown,
    readonly logger: Logger
    readonly formatErrorFunction: (error: GraphQLError) => GraphQLFormattedError
    readonly customHeaders?: Record<string, string>,
    readonly executionResult?: ExecutionResult,
    readonly statusCode?: number,
}
