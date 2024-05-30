/* eslint-disable @typescript-eslint/naming-convention */
import { GraphQLError, GraphQLFormattedError } from 'graphql'
import { expect, test } from 'vitest'
import { sendResponse } from '~/src'
import { NO_LOGGER, StandaloneGraphQLServerResponse } from '../TestHelpers'

const standaloneGraphQLServerResponse = new StandaloneGraphQLServerResponse()

test('Should use default response.end behavior if no responseEndChunkFunction if defined', () => {
    sendResponse({
        context: undefined,
        executionResult: {
            data: { message: 'Did work!' },
        },
        formatErrorFunction: function (
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
