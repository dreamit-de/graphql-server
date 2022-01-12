import {GraphQLRequestInfo,
    Request} from './GraphQLServer'

/**
 * Interface for RequestInformationExtractor.
 * Extracts information for handling GraphQL requests (query, operationName and/or variables)
 * from request url parameters or body and returns a Promise with the extracted GraphQLRequestInfo
 */
export interface RequestInformationExtractor {
    extractInformationFromRequest(request: Request): Promise<GraphQLRequestInfo>
}
