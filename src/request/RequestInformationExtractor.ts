import {
    GraphQLRequestInfo,
    GraphQLServerRequest
} from '@dreamit/graphql-server-base'

/**
 * Interface for RequestInformationExtractor.
 * Extracts information for handling GraphQL requests (query, operationName and/or variables)
 * from request url parameters or body and returns a Promise with the extracted GraphQLRequestInfo
 */
export interface RequestInformationExtractor {
    extractInformationFromRequest(request: GraphQLServerRequest)
    : GraphQLRequestInfo
}
