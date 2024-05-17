import {
    DefaultGraphQLServerOptions,
    defaultCollectErrorMetrics,
    defaultContextFunction,
    defaultExtensions,
    defaultFormatErrorFunction,
    defaultOnlyQueryInGetRequestsResponse,
} from '@/index'
import { Logger } from '@dreamit/graphql-server-base'
import { GraphQLError } from 'graphql'
import { expect, test, vi } from 'vitest'
import { JSON_CT_HEADER, LOGGER } from '../TestHelpers'

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

test.each([undefined, LOGGER])(
    'defaultContextFunction should return the expected formatted error',
    (logger: Logger | undefined) => {
        if (logger) {
            vi.spyOn(logger, 'debug')
        }

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
            expect(logger.debug).toHaveBeenLastCalledWith(
                'Calling defaultRequestResponseContextFunction with request [object Object] and response undefined',
                {
                    headers: JSON_CT_HEADER,
                },
            )
        }
    },
)

test.each([undefined, LOGGER])(
    'defaultExtensions should return undefined',
    (logger: Logger | undefined) => {
        if (logger) {
            vi.spyOn(logger, 'debug')
        }

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
            expect(logger.debug).toHaveBeenLastCalledWith(
                'Calling defaultExtensions for requestInfo {} and executionResult {}',
                // eslint-disable-next-line unicorn/no-useless-undefined
                undefined,
            )
        }
    },
)

test.each([undefined, LOGGER])(
    'defaultCollectErrorMetrics should log a debug message if logger is available',
    (logger: Logger | undefined) => {
        if (logger) {
            vi.spyOn(logger, 'debug')
        }

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
            expect(logger.debug).toHaveBeenLastCalledWith(
                'Calling defaultCollectErrorMetrics with error undefined and errorName test',
                // eslint-disable-next-line unicorn/no-useless-undefined
                undefined,
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
