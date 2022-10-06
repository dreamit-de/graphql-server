import {ExecutionResult} from 'graphql'

export interface GraphQLExecutionResult {
    executionResult: ExecutionResult
    statusCode?: number
    customHeaders?: Record<string, string>,
}
