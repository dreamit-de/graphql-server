import {
    ExecutionResult,
    GraphQLError
} from 'graphql'
import {GraphQLRequestInfo} from '..'

/**
 * Interface for execution results.
 * Contains the GraphQL related ExecutionResult as well as statusCode and customHeaders that might
 * contain additional information for handling responses. The requestInformation is available
 * to have both the result and request information in one interface, e.g. to use it for caching.
 */
export interface GraphQLExecutionResult {
    executionResult: ExecutionResult
    statusCode?: number
    customHeaders?: Record<string, string>
    requestInformation?: GraphQLRequestInfo
}

export function getFirstErrorFromExecutionResult(result: GraphQLExecutionResult)
    : GraphQLError {
    if (result.executionResult.errors && result.executionResult.errors.length > 0) {
        return result.executionResult.errors[0]
    }
    return new GraphQLError('No error found in ExecutionResult!', {})
}
