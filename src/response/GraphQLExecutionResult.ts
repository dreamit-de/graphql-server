import type { GraphQLExecutionResult } from '@dreamit/graphql-server-base'
import { GraphQLError } from 'graphql'

export function getFirstErrorFromExecutionResult(
    result: GraphQLExecutionResult,
): GraphQLError {
    if (
        result.executionResult.errors &&
        result.executionResult.errors.length > 0
    ) {
        return result.executionResult.errors[0]
    }
    return new GraphQLError('No error found in ExecutionResult!', {})
}
