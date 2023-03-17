import {
    GraphQLError
} from 'graphql'
import {GraphQLExecutionResult} from '@sgohlke/graphql-server-base'

export function getFirstErrorFromExecutionResult(result: GraphQLExecutionResult)
    : GraphQLError {
    if (result.executionResult.errors && result.executionResult.errors.length > 0) {
        return result.executionResult.errors[0]
    }
    return new GraphQLError('No error found in ExecutionResult!', {})
}
