import {
    GraphQLExecutionResult,
    ResponseParameters
} from '@dreamit/graphql-server-base'

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
