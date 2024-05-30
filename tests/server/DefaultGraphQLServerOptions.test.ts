import {
    DefaultGraphQLServerOptions,
    defaultCollectErrorMetrics,
    defaultContextFunction,
    defaultExtensions,
    defaultFormatErrorFunction,
    defaultOnlyQueryInGetRequestsResponse,
} from '@/index'
import { GraphQLError } from 'graphql'
import { expect, test } from 'vitest'
import { JSON_CT_HEADER, JsonTestLogger } from '../TestHelpers'

test('Creating DefaultGraphQLServerOptions should provide useful defaults', () => {
    const defaultGraphqlServerOptions = new DefaultGraphQLServerOptions()
    expect(defaultGraphqlServerOptions.customValidationRules).toStrictEqual([])
    expect(defaultGraphqlServerOptions.removeValidationRecommendations).toBe(
        true,
    )
    expect(defaultGraphqlServerOptions.reassignAggregateError).toBe(false)
})

test('defaultFormatErrorFunction should return the expected formatted error', () => {
    expect(
        defaultFormatErrorFunction(new GraphQLError('An error', {})),
    ).toStrictEqual({
        message: 'An error',
    })
})

test.each([undefined, new JsonTestLogger(true)])(
    'defaultContextFunction should return the expected formatted error',
    (logger: JsonTestLogger | undefined) => {
        expect(
            defaultContextFunction({
                request: {
                    headers: JSON_CT_HEADER,
                },
                serverOptions: {
                    logger,
                },
            }),
        ).toStrictEqual({ headers: JSON_CT_HEADER })

        if (logger) {
            expect(logger.logEntries.at(0)?.message).toBe(
                'Calling defaultRequestResponseContextFunction with request [object Object] and response undefined',
            )
        }
    },
)

test.each([undefined, new JsonTestLogger(true)])(
    'defaultExtensions should return undefined',
    (logger: JsonTestLogger | undefined) => {
        expect(
            defaultExtensions({
                executionResult: {},
                requestInformation: {},
                serverOptions: {
                    logger,
                },
            }),
        ).toBeUndefined()

        if (logger) {
            expect(logger.logEntries.at(0)?.message).toBe(
                'Calling defaultExtensions for requestInfo {} and executionResult {}',
            )
        }
    },
)

test.each([undefined, new JsonTestLogger(true)])(
    'defaultCollectErrorMetrics should log a debug message if logger is available',
    (logger: JsonTestLogger | undefined) => {
        expect(
            defaultCollectErrorMetrics({
                error: undefined,
                errorName: 'test',
                serverOptions: {
                    logger,
                },
            }),
        ).toBeUndefined()

        if (logger) {
            expect(logger.logEntries.at(0)?.message).toBe(
                'Calling defaultCollectErrorMetrics with error undefined and errorName test',
            )
        }
    },
)

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
