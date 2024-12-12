import { fc, test as propertyTest } from '@fast-check/vitest'
import { GraphQLError, GraphQLFormattedError } from 'graphql'
import { sendResponse } from 'src'
import { expect, test } from 'vitest'
import { NO_LOGGER, StandaloneGraphQLServerResponse } from '../TestHelpers'

test('Should use default response.end behavior if no responseEndChunkFunction if defined', () => {
    const standaloneGraphQLServerResponse =
        new StandaloneGraphQLServerResponse()
    sendResponse({
        context: undefined,
        executionResult: {
            data: { message: 'Did work!' },
        },
        formatErrorFunction: function testFormatErrorFunction(
            error: GraphQLError,
        ): GraphQLFormattedError {
            return error
        },
        logger: NO_LOGGER,
        response: standaloneGraphQLServerResponse,
        statusCode: 401,
    })

    const lastResponse =
        standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(lastResponse.data.message).toStrictEqual('Did work!')
    expect(standaloneGraphQLServerResponse.statusCode).toBe(401)
    expect(standaloneGraphQLServerResponse.headers.get('Content-Type')).toBe(
        'application/json; charset=utf-8',
    )
})

// This tests the same as the previous test, we need the original test for the coverage as it does not yet work with property tests
propertyTest.prop([fc.string()])(
    'Should use default response.end behavior if no responseEndChunkFunction if defined and return expected message',
    (messageToTest) => {
        const standaloneGraphQLServerResponse =
            new StandaloneGraphQLServerResponse()
        sendResponse({
            context: undefined,
            executionResult: {
                data: { message: messageToTest },
            },
            formatErrorFunction: function testFormatErrorFunction(
                error: GraphQLError,
            ): GraphQLFormattedError {
                return error
            },
            logger: NO_LOGGER,
            response: standaloneGraphQLServerResponse,
            statusCode: 200,
        })

        const lastResponse =
            standaloneGraphQLServerResponse.getLastResponseAsObject()

        return (
            lastResponse.data.message === messageToTest &&
            standaloneGraphQLServerResponse.statusCode === 200 &&
            standaloneGraphQLServerResponse.headers.get('Content-Type') ===
                'application/json; charset=utf-8'
        )
    },
)
