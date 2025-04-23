// eslint-disable no-useless-spread
import { JsonContentTypeHeader } from '@dreamit/graphql-testing'
import { GraphQLError } from 'graphql'
import {
    defaultCollectErrorMetrics,
    defaultContextFunction,
    defaultExtensions,
    defaultFormatErrorFunction,
    defaultGraphQLServerOptions,
    defaultOnlyQueryInGetRequestsResponse,
} from 'src'
import { expect, test } from 'vitest'
import { JsonTestLogger } from '../TestHelpers'

test('Using defaultGraphQLServerOptions should provide useful defaults', () => {
    expect(defaultGraphQLServerOptions.customValidationRules).toStrictEqual([])
    expect(defaultGraphQLServerOptions.removeValidationRecommendations).toBe(
        true,
    )
    expect(defaultGraphQLServerOptions.reassignAggregateError).toBe(false)
})

test('defaultFormatErrorFunction should return the expected formatted error', () => {
    expect(
        defaultFormatErrorFunction(new GraphQLError('An error', {})),
    ).toStrictEqual({
        message: 'An error',
    })
})

test('defaultContextFunction should return the expected formatted error', () => {
    const logger = new JsonTestLogger(true)
    expect(
        defaultContextFunction({
            request: {
                headers: JsonContentTypeHeader,
            },
            serverOptions: {
                ...defaultGraphQLServerOptions,
                ...{ logger },
            },
        }),
    ).toStrictEqual({ headers: JsonContentTypeHeader })
    if (logger) {
        expect(logger.logEntries.at(0)?.message).toBe(
            'Calling defaultRequestResponseContextFunction with request [object Object] and response undefined',
        )
    }
})

test('defaultExtensions should return undefined', () => {
    const logger = new JsonTestLogger(true)
    expect(
        defaultExtensions({
            executionResult: {},
            requestInformation: {},
            serverOptions: {
                ...defaultGraphQLServerOptions,
                ...{ logger },
            },
        }),
    ).toBeUndefined()
    expect(logger.logEntries.at(0)?.message).toBe(
        'Calling defaultExtensions for requestInfo {} and executionResult {}',
    )
})

test('defaultCollectErrorMetrics should log a debug message if logger is available', () => {
    const logger = new JsonTestLogger(true)
    expect(
        defaultCollectErrorMetrics({
            error: undefined,
            errorName: 'test',
            serverOptions: {
                ...defaultGraphQLServerOptions,
                ...{ logger },
            },
        }),
    ).toBeUndefined()
    expect(logger.logEntries.at(0)?.message).toBe(
        'Calling defaultCollectErrorMetrics with error undefined and errorName test',
    )
})

test('defaultOnlyQueryInGetRequestsResponse should return the expected execution result', () => {
    expect(defaultOnlyQueryInGetRequestsResponse('POST')).toStrictEqual({
        customHeaders: { allow: 'POST' },
        executionResult: {
            errors: [
                new GraphQLError(
                    'Only "query" operation is allowed in "GET" requests.' +
                        ' Got: "POST"',
                    {},
                ),
            ],
        },
        statusCode: 405,
    })
})
