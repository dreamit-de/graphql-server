/* eslint-disable max-len */
import { GraphQLError } from 'graphql'
import { getFirstErrorFromExecutionResult } from 'src'
import { expect, test } from 'vitest'

test('Should get first error from ExecutionResult', () => {
    const result = getFirstErrorFromExecutionResult({
        executionResult: {
            errors: [
                new GraphQLError('First error', {}),
                new GraphQLError('Second error', {}),
            ],
        },
    })
    expect(result.message).toBe('First error')
})

test(
    'Should return error message if no error is available when ' +
        'calling getFirstErrorFromExecutionResult',
    () => {
        const result = getFirstErrorFromExecutionResult({
            executionResult: {
                data: { response: 'doesnotmatter' },
            },
        })
        expect(result.message).toBe('No error found in ExecutionResult!')
    },
)

test(
    'Should return error message if execution result has an empty error array ' +
        'when calling getFirstErrorFromExecutionResult',
    () => {
        const result = getFirstErrorFromExecutionResult({
            executionResult: {
                errors: [],
            },
        })
        expect(result.message).toBe('No error found in ExecutionResult!')
    },
)
